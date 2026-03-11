import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ShieldAlert, Lock, Mail, KeyRound, ArrowLeft, Shield } from "lucide-react";

let supabaseClient: ReturnType<typeof createClient> | null = null;

async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const res = await fetch("/api/auth/supabase-config");
  if (!res.ok) throw new Error("Supabase config unavailable");
  const { url, anonKey } = await res.json();
  supabaseClient = createClient(url, anonKey);
  return supabaseClient;
}

type Step = "email" | "otp";

export default function Login() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const utils = trpc.useUtils();

  const exchangeToken = trpc.auth.exchangeSupabaseToken.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      window.location.href = "/";
    },
    onError: (err) => {
      toast.error("Błąd autoryzacji: " + err.message);
      setLoading(false);
    },
  });

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setStep("otp");
      toast.success("Kod wysłany — sprawdź skrzynkę pocztową");
    } catch (err: any) {
      toast.error(err.message ?? "Nie udało się wysłać kodu");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "email",
      });
      if (error) throw error;
      const accessToken = data.session?.access_token;
      const refreshToken = data.session?.refresh_token ?? "";
      if (!accessToken) throw new Error("Brak tokenu dostępu");
      await exchangeToken.mutateAsync({ accessToken, refreshToken });
    } catch (err: any) {
      toast.error(err.message ?? "Nieprawidłowy kod");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <ShieldAlert className="w-12 h-12 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-mono tracking-wide">ENGLISH TEACHER FACTORY</h1>
            <p className="text-muted-foreground text-sm mt-1">Platforma edukacyjna — Autoryzacja wymagana</p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="border border-border rounded-lg p-4 bg-card space-y-2">
          <p className="text-xs text-muted-foreground font-mono">SYSTEM STATUS</p>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-foreground">Dostęp nieautoryzowany</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Lock className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Wymagane uwierzytelnienie OTP</span>
          </div>
        </div>

        {/* Login form */}
        <div className="border border-border rounded-lg p-6 bg-card space-y-6">
          {step === "email" ? (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-foreground font-mono">AUTORYZUJ DOSTĘP</h2>
                <p className="text-muted-foreground text-xs">
                  Podaj adres email aby otrzymać jednorazowy kod dostępu
                </p>
              </div>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-medium text-muted-foreground font-mono uppercase tracking-wider">
                    Adres email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="operator@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground font-mono"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full font-mono"
                  disabled={loading || !email.trim()}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />WYSYŁANIE…</>
                  ) : (
                    <><Shield className="w-4 h-4 mr-2" />WYŚLIJ KOD DOSTĘPU</>
                  )}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center font-mono">
                DOSTĘP OGRANICZONY DO AUTORYZOWANYCH UŻYTKOWNIKÓW
              </p>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <button
                  onClick={() => { setStep("email"); setOtp(""); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2 font-mono"
                >
                  <ArrowLeft className="w-3 h-3" /> WRÓĆ
                </button>
                <h2 className="text-lg font-bold text-foreground font-mono">WPROWADŹ KOD</h2>
                <p className="text-muted-foreground text-xs">
                  Wysłano 6-cyfrowy kod na{" "}
                  <span className="text-foreground font-medium font-mono">{email}</span>
                </p>
              </div>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="otp" className="text-xs font-medium text-muted-foreground font-mono uppercase tracking-wider">
                    Kod jednorazowy
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      required
                      autoFocus
                      className="pl-9 bg-input border-border text-foreground text-center tracking-[0.4em] text-lg font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Nie otrzymałeś kodu?{" "}
                    <button
                      type="button"
                      onClick={() => { setStep("email"); setOtp(""); }}
                      className="text-primary hover:underline"
                    >
                      Wyślij ponownie
                    </button>
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full font-mono"
                  disabled={loading || otp.length < 6}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />WERYFIKACJA…</>
                  ) : (
                    <><Lock className="w-4 h-4 mr-2" />AUTORYZUJ DOSTĘP</>
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
