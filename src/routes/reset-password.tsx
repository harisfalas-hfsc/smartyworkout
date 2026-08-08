import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  head: () => ({
    meta: [
      { title: "Reset password — SmartyWorkout" },
      { name: "description", content: "Set a new password for your SmartyWorkout account." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const isRecoveryLink = hash.get("type") === "recovery";

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (active && (data.session || isRecoveryLink)) setReady(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => navigate({ to: "/coach", replace: true }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[420px] flex-col px-5 pb-6 pt-5">
      <h1 style={{ fontWeight: 800, fontSize: 24, color: "#14213A", letterSpacing: "-0.01em" }}>
        Set a new password
      </h1>
      <p className="-mt-1 mb-4 text-sm" style={{ color: "#6B7A90" }}>
        {ready ? "Choose a new password for your account." : "Verifying your reset link..."}
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="np">New password</Label>
          <div className="relative">
            <Input
              id="np"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={!ready}
              className="h-11 rounded-xl pr-11"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <Button
          type="submit"
          disabled={!ready || submitting || done}
          style={{ background: "#FF6B4A", boxShadow: "0 14px 24px -10px rgba(255,107,74,0.55)", color: "#fff" }}
          className="mt-2 h-12 w-full rounded-2xl text-base font-semibold hover:opacity-95"
        >
          {done ? "Password updated ✓" : submitting ? "Updating..." : "Update password"}
        </Button>
        {error && <p className="text-center text-sm font-semibold text-destructive">{error}</p>}
      </form>
    </div>
  );
}