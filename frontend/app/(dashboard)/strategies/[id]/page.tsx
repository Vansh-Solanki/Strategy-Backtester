import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { Header } from "@/components/layout/header";
import { StrategyForm } from "@/components/strategy/strategy-form";
import { apiClient, APIError } from "@/lib/api-client";

export default async function EditStrategyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.accessToken) {
    notFound();
  }

  const strategy = await fetchStrategy(session.accessToken, id);

  return (
    <>
      <Header title={strategy.name} userName={session.user?.name ?? session.user?.email ?? "User"} />
      <main className="p-6">
        <StrategyForm mode="edit" strategy={strategy} />
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
