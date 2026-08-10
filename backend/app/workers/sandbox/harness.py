"""Runs one user strategy against one bar series in an isolated subprocess.

Invoked by app.workers.tasks.run_backtest via `subprocess.run([sys.executable, __file__], ...)`.
Reads a single JSON payload from stdin and writes a single JSON result line to stdout — that
line is the only contract with the parent process. Anything the user's own code prints is
captured separately and returned as `console_output` rather than mixed into stdout, since stdout
here is the return channel, not a terminal.

Resource limits (POSIX only — this always runs inside the Linux worker container, never
directly on a developer's Windows host) bound CPU time and address space so a runaway or
malicious strategy can't hang or exhaust the worker. Combined with the restricted `__import__`
below and Phase 3's ast.parse() authoring-time check, this is the full security boundary
documented in progress.md; true network-namespace isolation is out of scope.
"""

import builtins
import contextlib
import io
import json
import sys
from datetime import date, datetime

CPU_TIME_LIMIT_SECONDS = 25
MEMORY_LIMIT_BYTES = 256 * 1024 * 1024

BANNED_BUILTINS = ("open", "exec", "eval", "compile", "input", "breakpoint")


def _apply_resource_limits() -> None:
    try:
        import resource

        resource.setrlimit(resource.RLIMIT_CPU, (CPU_TIME_LIMIT_SECONDS, CPU_TIME_LIMIT_SECONDS))
        resource.setrlimit(resource.RLIMIT_AS, (MEMORY_LIMIT_BYTES, MEMORY_LIMIT_BYTES))
    except (ImportError, ValueError, OSError):
        # `resource` is POSIX-only. If limits can't be set, the parent's
        # subprocess.run(timeout=...) wall-clock cutoff is still enforced.
        pass


def _make_restricted_globals(pd, np) -> dict:
    real_import = builtins.__import__

    def restricted_import(name, *args, **kwargs):
        if name.split(".")[0] not in ("pandas", "numpy"):
            raise ImportError(f"import of '{name}' is not allowed in the strategy sandbox")
        return real_import(name, *args, **kwargs)

    safe_builtins = {
        name: value for name, value in vars(builtins).items() if name not in BANNED_BUILTINS
    }
    safe_builtins["__import__"] = restricted_import

    return {"__builtins__": safe_builtins, "pd": pd, "np": np, "pandas": pd, "numpy": np}


def _json_default(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def main() -> None:
    _apply_resource_limits()

    import numpy as np
    import pandas as pd

    payload = json.loads(sys.stdin.read())
    code: str = payload["code"]
    params: dict = payload["params"]
    bars: list[dict] = payload["bars"]
    initial_capital: float = float(payload["initial_capital"])
    position_size: float = float(payload["position_size"])
    stop_loss: float = float(payload["stop_loss"])

    console = io.StringIO()

    try:
        with contextlib.redirect_stdout(console):
            safe_globals = _make_restricted_globals(pd, np)
            exec(code, safe_globals)

            should_enter = safe_globals.get("should_enter")
            should_exit = safe_globals.get("should_exit")
            on_start = safe_globals.get("on_start")
            if not callable(should_enter) or not callable(should_exit):
                raise ValueError("Strategy must define should_enter and should_exit")

            df = pd.DataFrame(bars)

            if callable(on_start):
                on_start(df, params)

            capital = initial_capital
            pos: dict | None = None
            trades: list[dict] = []
            equity_curve: list[dict] = []

            for i in range(len(df)):
                row = df.iloc[i].to_dict()
                hist = df.iloc[: i + 1]
                close_price = float(row["close"])

                if pos is None:
                    if should_enter(row, hist, params):
                        allocation = capital * position_size
                        qty = int(allocation // close_price) if close_price > 0 else 0
                        if qty > 0:
                            capital -= qty * close_price
                            pos = {
                                "entry_price": close_price,
                                "entry_date": row["date"],
                                "shares": qty,
                            }
                else:
                    stop_price = pos["entry_price"] * (1 - stop_loss)
                    stopped_out = close_price <= stop_price
                    if stopped_out or should_exit(row, hist, params, pos):
                        proceeds = pos["shares"] * close_price
                        cost = pos["shares"] * pos["entry_price"]
                        pnl = proceeds - cost
                        trades.append(
                            {
                                "entry_date": pos["entry_date"],
                                "exit_date": row["date"],
                                "entry_price": pos["entry_price"],
                                "exit_price": close_price,
                                "quantity": pos["shares"],
                                "direction": "long",
                                "pnl": pnl,
                                "pnl_pct": (pnl / cost) if cost else 0.0,
                            }
                        )
                        capital += proceeds
                        pos = None

                mark_value = capital + (pos["shares"] * close_price if pos else 0.0)
                equity_curve.append({"date": row["date"], "value": mark_value})

            if pos is not None:
                trades.append(
                    {
                        "entry_date": pos["entry_date"],
                        "exit_date": None,
                        "entry_price": pos["entry_price"],
                        "exit_price": None,
                        "quantity": pos["shares"],
                        "direction": "long",
                        "pnl": None,
                        "pnl_pct": None,
                    }
                )

        result = {
            "error": None,
            "trades": trades,
            "equity_curve": equity_curve,
            "console_output": console.getvalue()[-10000:],
        }
    except Exception as exc:  # noqa: BLE001 — any strategy failure must be reported, not raised
        result = {
            "error": f"{type(exc).__name__}: {exc}",
            "trades": [],
            "equity_curve": [],
            "console_output": console.getvalue()[-10000:],
        }

    sys.stdout.write(json.dumps(result, default=_json_default))
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
