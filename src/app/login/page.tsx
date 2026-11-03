import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { StaleSessionCleanup } from "@/components/auth/stale-session-cleanup";
import { getCurrentUser, SESSION_COOKIE } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in — WithUnion CRM",
  description: "Sign in to your WithUnion CRM workspace.",
};

function safeNext(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (raw.startsWith("/login")) return "/dashboard";
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;

  // Only skip the form when the cookie maps to a live session row.
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  // A cookie that no longer resolves to a session must be cleared; otherwise
  // the proxy and protected pages can bounce the user back here forever.
  // Clearing uses POST so a cross-site GET link cannot sign the user out.
  const hasStaleCookie = Boolean((await cookies()).get(SESSION_COOKIE)?.value);
  if (hasStaleCookie) return <StaleSessionCleanup />;

  return (
    <LoginForm
      next={safeNext(next)}
      showDemoHint={process.env.NODE_ENV !== "production"}
    />
  );
}
