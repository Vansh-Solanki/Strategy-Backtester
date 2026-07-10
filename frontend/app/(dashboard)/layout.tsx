import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={session.user.name ?? session.user.email ?? "User"} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
