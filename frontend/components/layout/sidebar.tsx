"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, LineChart, TrendingUp, User, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/strategies", label: "Strategies", icon: LineChart },
  { href: "/market-data", label: "Market Data", icon: TrendingUp },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col justify-between border-r bg-sidebar p-4">
      <div>
        <div className="mb-6 px-2 text-lg font-semibold">Backtester</div>
        <nav className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === href && "bg-accent text-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="space-y-2 border-t pt-4">
        <p className="truncate px-2 text-sm font-medium">{userName}</p>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => signOut({ redirectTo: "/sign-in" })}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
