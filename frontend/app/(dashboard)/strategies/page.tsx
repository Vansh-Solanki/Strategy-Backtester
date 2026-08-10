import { auth } from "@/auth";
import { Header } from "@/components/layout/header";
import { StrategyListClient } from "@/components/strategy/strategy-list-client";
import { apiClient } from "@/lib/api-client";

export default async function StrategiesPage() {
  const session = await auth();
  const strategies = session?.accessToken
    ? await apiClient.listStrategies(session.accessToken).catch(() => [])
    : [];

  return (
    <>
      <Header title="Strategies" userName={session?.user?.name ?? session?.user?.email ?? "User"} />
      <main className="p-6">
        <StrategyListClient initialStrategies={strategies} />
      </main>
    </>
  );
}
