import { LogOutIcon } from "lucide-react";
import Link from "next/link";

import { logout } from "@/app/(auth)/login/actions";
import { Logo } from "@/components/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Logo />
              MailPulse
            </Link>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <ThemeToggle />
              <form action={logout}>
                <Button variant="ghost" size="icon" type="submit">
                  <LogOutIcon />
                  <span className="sr-only">Se déconnecter</span>
                </Button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
      </div>
    </NotificationsProvider>
  );
}
