import Link from "next/link";

import { auth } from "@/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name ?? "there";

  return (
    <>
      <Header title="Dashboard" userName={session?.user?.name ?? session?.user?.email ?? "User"} />
      <main className="space-y-6 p-6">
        <p className="text-lg">Welcome back, {userName}</p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Strategies
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">0</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Backtests
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">0</CardContent>
          </Card>
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground">No strategies yet.</p>
          <Link href="/strategies" className={cn(buttonVariants({ variant: "default" }))}>
            Create your first strategy →
          </Link>
        </div>
      </main>
    </>
  );
}
