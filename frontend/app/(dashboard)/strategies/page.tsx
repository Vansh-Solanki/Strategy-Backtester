import { auth } from "@/auth";
import { Header } from "@/components/layout/header";

export default async function StrategiesPage() {
  const session = await auth();

  return (
    <>
      <Header title="Strategies" userName={session?.user?.name ?? session?.user?.email ?? "User"} />
      <main className="p-6">
        <p className="text-muted-foreground">No strategies yet.</p>
      </main>
    </>
  );
}
