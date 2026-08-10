"""Static strategy code templates served by GET /strategies/templates.

Selecting a template only loads its code into the Monaco editor client-side —
no database write happens here. These are plain strings, not executed.
"""

BLANK_SLATE = """# Available per bar:
#   row  : dict        — {'date', 'open', 'high', 'low', 'close', 'adj_close', 'volume'}
#   hist : pd.DataFrame — all bars from start up to and including the current bar
#   p    : dict        — your params dict, defined below
#   pos  : dict | None — None when flat; else {'entry_price', 'entry_date', 'shares'}

import pandas as pd
import numpy as np


def should_enter(row, hist, p):
    ...


def should_exit(row, hist, p, pos):
    ...
"""

SMA_CROSSOVER = """import pandas as pd


def should_enter(row, hist, p):
    fast = hist['adj_close'].rolling(p['fast']).mean().iloc[-1]
    slow = hist['adj_close'].rolling(p['slow']).mean().iloc[-1]
    return fast > slow


def should_exit(row, hist, p, pos):
    fast = hist['adj_close'].rolling(p['fast']).mean().iloc[-1]
    slow = hist['adj_close'].rolling(p['slow']).mean().iloc[-1]
    return fast < slow
"""

RSI_THRESHOLD = """import pandas as pd
import numpy as np


def _rsi(series, period):
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def should_enter(row, hist, p):
    rsi = _rsi(hist['adj_close'], p['period']).iloc[-1]
    return rsi < p['oversold']


def should_exit(row, hist, p, pos):
    rsi = _rsi(hist['adj_close'], p['period']).iloc[-1]
    return rsi > p['overbought']
"""

MACD_SIGNAL = """import pandas as pd


def _macd(series, fast, slow, signal):
    fast_ema = series.ewm(span=fast, adjust=False).mean()
    slow_ema = series.ewm(span=slow, adjust=False).mean()
    macd_line = fast_ema - slow_ema
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    return macd_line, signal_line


def should_enter(row, hist, p):
    macd_line, signal_line = _macd(hist['adj_close'], p['fast'], p['slow'], p['signal'])
    if len(macd_line) < 2:
        return False
    crossed_above = macd_line.iloc[-2] <= signal_line.iloc[-2] and macd_line.iloc[-1] > signal_line.iloc[-1]
    return crossed_above


def should_exit(row, hist, p, pos):
    macd_line, signal_line = _macd(hist['adj_close'], p['fast'], p['slow'], p['signal'])
    if len(macd_line) < 2:
        return False
    crossed_below = macd_line.iloc[-2] >= signal_line.iloc[-2] and macd_line.iloc[-1] < signal_line.iloc[-1]
    return crossed_below
"""

BOLLINGER_BREAKOUT = """import pandas as pd


def _bands(series, period, num_std):
    mid = series.rolling(period).mean()
    std = series.rolling(period).std()
    upper = mid + num_std * std
    lower = mid - num_std * std
    return mid, upper, lower


def should_enter(row, hist, p):
    mid, upper, _ = _bands(hist['adj_close'], p['period'], p['num_std'])
    return row['adj_close'] > upper.iloc[-1]


def should_exit(row, hist, p, pos):
    mid, _, _ = _bands(hist['adj_close'], p['period'], p['num_std'])
    return row['adj_close'] < mid.iloc[-1]
"""

MEAN_REVERSION = """import pandas as pd


def _zscore(series, period):
    mean = series.rolling(period).mean()
    std = series.rolling(period).std()
    return (series - mean) / std


def should_enter(row, hist, p):
    z = _zscore(hist['adj_close'], p['period']).iloc[-1]
    return z < -p['threshold']


def should_exit(row, hist, p, pos):
    z = _zscore(hist['adj_close'], p['period']).iloc[-1]
    return z >= 0
"""

STRATEGY_TEMPLATES = [
    {
        "name": "Blank slate",
        "description": "Empty scaffold with inline API comments",
        "code": BLANK_SLATE,
        "default_params": {},
    },
    {
        "name": "SMA crossover",
        "description": "Enter when the fast moving average crosses above the slow one",
        "code": SMA_CROSSOVER,
        "default_params": {"fast": 20, "slow": 50},
    },
    {
        "name": "RSI threshold",
        "description": "Enter when RSI drops below an oversold level, exit above overbought",
        "code": RSI_THRESHOLD,
        "default_params": {"period": 14, "oversold": 30, "overbought": 70},
    },
    {
        "name": "MACD signal",
        "description": "Enter/exit on MACD line crossing its signal line",
        "code": MACD_SIGNAL,
        "default_params": {"fast": 12, "slow": 26, "signal": 9},
    },
    {
        "name": "Bollinger breakout",
        "description": "Enter on a breakout above the upper band, exit at the middle band",
        "code": BOLLINGER_BREAKOUT,
        "default_params": {"period": 20, "num_std": 2},
    },
    {
        "name": "Mean reversion",
        "description": "Enter when price z-score is far below the rolling mean, exit at zero",
        "code": MEAN_REVERSION,
        "default_params": {"period": 20, "threshold": 2},
    },
]
