import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { trpc } from "@/lib/trpc";

export default function AuthCallback() {
  const exchangeToken = trpc.auth.exchangeSupabaseToken.useMutation({
    onSuccess: () => { window.location.href = "/"; },
    onError: (err) => {
      console.error("Auth error:", err);
      window.location.href = "/login?error=auth_failed";
    },
  });

  useEffect(() => {
    async function handleCallback() {
      try {
        const res = await fetch("/api/auth/supabase-config");
        if (!res.ok) throw new Error("Config unavailable");
        const { url, anonKey } = await res.json();
        const supabase = createClient(url, anonKey);
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          window.location.href = "/login?error=no_session";
          return;
        }
        await exchangeToken.mutateAsync({
          accessToken: session.access_token,
          refreshToken: session.refresh_token ?? "",
        });
      } catch (err) {
        console.error("Callback error:", err);
        window.location.href = "/login?error=callback_failed";
      }
    }
    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground font-mono text-sm">AUTORYZACJA…</p>
      </div>
    </div>
  );
}
