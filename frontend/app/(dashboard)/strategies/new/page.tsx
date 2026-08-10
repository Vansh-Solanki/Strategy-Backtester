import { auth } from "@/auth";
import { Header } from "@/components/layout/header";
import { StrategyForm } from "@/components/strategy/strategy-form";

export default async function NewStrategyPage() {
  const session = await auth();

  return (
    <>
      <Header title="New Strategy" userName={session?.user?.name ?? session?.user?.email ?? "User"} />
      <main className="p-6">
        <StrategyForm mode="create" />
      </main>
    </>
  );
}
