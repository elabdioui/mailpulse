import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";

import { LoginForm } from "./login-form";

// Forces a fresh render per request so the nonce-based CSP from
// src/proxy.ts applies here too (see content-security-policy.md).
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Logo className="mb-1 size-8" />
          <CardTitle className="text-xl">MailPulse</CardTitle>
          <p className="text-sm text-muted-foreground">
            Connecte-toi pour accéder à ton tableau de bord.
          </p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
