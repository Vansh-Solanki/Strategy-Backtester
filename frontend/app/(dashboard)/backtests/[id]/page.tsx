import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { Header } from "@/components/layout/header";
import { BacktestDetailClient } from "@/components/backtest/backtest-detail-client";
import { apiClient, APIError } from "@/lib/api-client";

export default async function BacktestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.accessToken) {
    notFound();
  }

  const backtest = await fetchBacktest(session.accessToken, id);

  return (
    <>
      <Header
        title={`${backtest.ticker} backtest`}
        userName={session.user?.name ?? session.user?.email ?? "User"}
      />
      <main className="p-6">
        <BacktestDetailClient initialBacktest={backtest} />
      </main>
    </>
  );
}

async function fetchBacktest(accessToken: string, id: string) {
  try {
    return await apiClient.getBacktest(accessToken, id);
  } catch (error) {
    if (error instanceof APIError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
