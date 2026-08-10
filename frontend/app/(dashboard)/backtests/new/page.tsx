import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { Header } from "@/components/layout/header";
import { BacktestForm } from "@/components/backtest/backtest-form";
import { apiClient, APIError } from "@/lib/api-client";

export default async function NewBacktestPage({
  searchParams,
}: {
  searchParams: Promise<{ strategyId?: string }>;
}) {
  const { strategyId } = await searchParams;
  const session = await auth();

  if (!session?.accessToken || !strategyId) {
    notFound();
  }

  const strategy = await fetchStrategy(session.accessToken, strategyId);

  return (
    <>
      <Header title="New backtest" userName={session.user?.name ?? session.user?.email ?? "User"} />
      <main className="p-6">
        <BacktestForm strategy={strategy} />
      </main>
    </>
  );
}

async function fetchStrategy(accessToken: string, id: string) {
  try {
    return await apiClient.getStrategy(accessToken, id);
  } catch (error) {
    if (error instanceof APIError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
