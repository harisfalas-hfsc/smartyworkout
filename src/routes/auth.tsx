import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import type { User } from "@supabase/supabase-js";


export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string; mode?: "signin" | "signup" | "forgot" } => {
    const n = typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined;
    const mode = s.mode === "signup" || s.mode === "forgot" || s.mode === "signin" ? s.mode : undefined;
    return { ...(n ? { next: n } : {}), ...(mode ? { mode } : {}) };
  },
  head: () => ({
    meta: [
      { title: "Sign in — SmartyWorkout" },
      { name: "description", content: "Sign in to SmartyWorkout to build your personalized training plan." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const { next, mode: routeMode } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(routeMode ?? "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const goNext = async () => {
    if (next) {
      navigate({ to: next as never, replace: true });
      return;
    }
    // Only send users to the Training Profile when they have not completed it yet.
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarded, health_acknowledged_at")
          .eq("id", uid)
          .maybeSingle();
        const row = profile as { onboarded?: boolean; health_acknowledged_at?: string | null } | null;
        if (row?.onboarded && row?.health_acknowledged_at) {
          navigate({ to: "/", replace: true });
          return;
        }
      }
    } catch {
      /* fall through to profile */
    }
    navigate({ to: "/profile", replace: true });
  };

  useEffect(() => {
    setMode(routeMode ?? "signin");
    setAuthError("");
    setAuthNotice("");
    setResetSent(false);
  }, [routeMode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && mode !== "forgot") goNext();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s && mode !== "forgot") goNext();
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, next, mode]);


  async function ensureProfile(authUser: User | null, fallbackName?: string) {
    if (!authUser) return;
    const meta = authUser.user_metadata ?? {};
    const displayName =
      fallbackName?.trim() ||
      (typeof meta.full_name === "string" ? meta.full_name.trim() : "") ||
      (typeof meta.name === "string" ? meta.name.trim() : "") ||
      authUser.email?.split("@")[0] ||
      "SmartyWorkout user";

    await supabase
      .from("profiles")
      .upsert({ id: authUser.id, display_name: displayName }, { onConflict: "id" });
  }

  async function submitSignup(e: FormEvent) {
    e.preventDefault();
    if (!name || !email || !age || !password) return;
    setAuthError("");
    setAuthNotice("");
    setSubmitting(true);
    try {
      const cleanName = name.trim();
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { name: cleanName, full_name: cleanName, age },
        },
      });
      if (error) throw error;
      if (data.session) {
        await ensureProfile(data.user, cleanName);
        goNext();
      } else {
        setPassword("");
        setAuthNotice("Check your email to confirm your account, then sign in.");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Account creation failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSignin(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setAuthError("");
    setAuthNotice("");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      await ensureProfile(data.user);
      goNext();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign in failed. Check your email and password.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitForgot(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setAuthError("");
    setAuthNotice("");
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Couldn't send reset email.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[420px] flex-col px-5 pb-6 pt-5">
      {mode === "signup" ? (
        <form onSubmit={submitSignup} className="mt-2 flex flex-col gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="-mt-1 text-sm" className="text-muted-foreground">Next, complete your mandatory Training Profile.</p>
          <div className="space-y-1.5">
            <Label htmlFor="n">Name</Label>
            <Input id="n" value={name} onChange={(e) => setName(e.target.value)} required className="h-11 rounded-xl" autoComplete="name" />
          </div>
          <div className="grid grid-cols-[1fr_90px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="e">Email</Label>
              <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-xl" autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a">Age</Label>
              <Input id="a" type="number" min={12} max={100} value={age} onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")} required className="h-11 rounded-xl" autoComplete="off" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p">Password</Label>
            <PasswordField id="p" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword((s) => !s)} autoComplete="new-password" />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            style={{ boxShadow: "0 14px 24px -10px hsl(0 0% 0% / 0.35)" }}
            className="mt-2 h-12 w-full rounded-2xl text-base font-semibold hover:opacity-95"
          >
            {submitting ? "Saving..." : "Continue"}
          </Button>
          {authNotice && <p className="text-center text-sm font-semibold" className="text-primary">{authNotice}</p>}
          {authError && <p className="text-center text-sm font-semibold text-destructive">{authError}</p>}
          <p className="mt-1 text-center text-sm" className="text-muted-foreground">
            Have an account?{" "}
            <button type="button" onClick={() => { setAuthError(""); setAuthNotice(""); setMode("signin"); }} className="bg-transparent p-0 font-bold text-primary">
              Sign in
            </button>
          </p>
        </form>
      ) : mode === "signin" ? (
        <form onSubmit={submitSignin} className="mt-2 flex flex-col gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="-mt-1 text-sm" className="text-muted-foreground">Sign in to continue your training journey.</p>
          <div className="space-y-1.5">
            <Label htmlFor="se">Email</Label>
            <Input id="se" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-xl" autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="sp">Password</Label>
              <button
                type="button"
                onClick={() => { setAuthError(""); setAuthNotice(""); setResetSent(false); setMode("forgot"); }}
                className="bg-transparent p-0 text-[13px] font-bold text-primary"
              >
                Forgot password?
              </button>
            </div>
            <PasswordField id="sp" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword((s) => !s)} autoComplete="current-password" />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            style={{ boxShadow: "0 14px 24px -10px hsl(0 0% 0% / 0.35)" }}
            className="mt-2 h-12 w-full rounded-2xl text-base font-semibold hover:opacity-95"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
          {authError && <p className="text-center text-sm font-semibold text-destructive">{authError}</p>}
          <p className="mt-1 text-center text-sm" className="text-muted-foreground">
            New here?{" "}
            <button type="button" onClick={() => { setAuthError(""); setAuthNotice(""); setMode("signup"); }} className="bg-transparent p-0 font-bold text-primary">
              Create an account
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={submitForgot} className="mt-2 flex flex-col gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Reset your password
          </h1>
          <p className="-mt-1 text-sm" className="text-muted-foreground">
            Enter your account email. We'll send you a link to set a new password.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="fe">Email</Label>
            <Input id="fe" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-xl" autoComplete="email" />
          </div>
          <Button
            type="submit"
            disabled={submitting || resetSent}
            style={{ boxShadow: "0 14px 24px -10px hsl(0 0% 0% / 0.35)" }}
            className="mt-2 h-12 w-full rounded-2xl text-base font-semibold hover:opacity-95"
          >
            {resetSent ? "Email sent ✓" : submitting ? "Sending..." : "Send reset link"}
          </Button>
          {resetSent && (
            <p className="text-center text-sm" className="text-primary">
              Check your inbox (and spam folder) for the reset link.
            </p>
          )}
          {authError && <p className="text-center text-sm font-semibold text-destructive">{authError}</p>}
          <p className="mt-1 text-center text-sm" className="text-muted-foreground">
            Remembered it?{" "}
            <button type="button" onClick={() => { setAuthError(""); setResetSent(false); setMode("signin"); }} className="bg-transparent p-0 font-bold text-primary">
              Back to sign in
            </button>
          </p>
        </form>
      )}
    </div>
  );
}

function PasswordField({
  id,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={6}
        className="h-11 rounded-xl pr-11"
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
