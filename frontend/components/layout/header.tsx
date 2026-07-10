import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header({ title, userName }: { title: string; userName: string }) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <Avatar>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
    </header>
  );
}
