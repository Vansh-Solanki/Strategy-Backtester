import { auth } from "@/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;

  return (
    <>
      <Header title="Profile" userName={user?.name ?? user?.email ?? "User"} />
      <main className="p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Account details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name: </span>
              {user?.name}
            </p>
            <p>
              <span className="text-muted-foreground">Email: </span>
              {user?.email}
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
