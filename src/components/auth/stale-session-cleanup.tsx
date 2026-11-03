"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

export function StaleSessionCleanup() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function clearStaleSession() {
      try {
        const res = await fetch("/api/auth/logout", {
          method: "POST",
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Unable to clear the expired session");

        if (!cancelled) window.location.replace("/login");
      } catch {
        if (!cancelled) {
          setError("We could not clear your expired session. Please reload the page.");
        }
      }
    }

    void clearStaleSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="flex max-w-sm flex-col items-center text-center">
        {error ? (
          <>
            <AlertCircle className="mb-3 h-8 w-8 text-rose-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Reload
            </button>
          </>
        ) : (
          <>
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-violet-600" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Clearing your expired session…
            </p>
          </>
        )}
      </div>
    </main>
  );
}
