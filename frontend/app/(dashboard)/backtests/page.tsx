import { auth } from "@/auth";
import { Header } from "@/components/layout/header";
import { BacktestListClient } from "@/components/backtest/backtest-list-client";
import { apiClient } from "@/lib/api-client";

export default async function BacktestsPage() {
  const session = await auth();
  const backtests = session?.accessToken
    ? await apiClient.listBacktests(session.accessToken).catch(() => [])
    : [];

  return (
    <>
      <Header title="Backtests" userName={session?.user?.name ?? session?.user?.email ?? "User"} />
      <main className="p-6">
        <BacktestListClient backtests={backtests} />
      </main>
    </>
  );
}
