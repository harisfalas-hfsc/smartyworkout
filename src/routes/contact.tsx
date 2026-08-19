import { createFileRoute, Link } from "@tanstack/react-router";
import { isOnline } from "@/lib/offline/connectivity";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { submitContactMessage, submitMemberMessage } from "@/lib/support.functions";
import {
  Mail,
  Send,
  CheckCircle2,
  Clock,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const SUPPORT_EMAIL = "smartyworkout@outlook.com";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact SmartyWorkout — We answer in 24–48 hours" },
      {
        name: "description",
        content:
          "Get in touch with the SmartyWorkout team. Questions, feedback, partnership, support — we reply within 24–48 hours.",
      },
      { property: "og:title", content: "Contact SmartyWorkout" },
      {
        property: "og:description",
        content: "Questions, feedback, or support? We reply within 24–48 hours.",
      },
      { property: "og:url", content: "https://smartyworkout.com/contact" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/contact" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          url: "https://smartyworkout.com/contact",
          name: "Contact SmartyWorkout",
          description:
            "Get in touch with the SmartyWorkout team. Questions, feedback, partnership, support — we reply within 24–48 hours.",
          inLanguage: "en",
          isPartOf: { "@id": "https://smartyworkout.com/#website" },
          mainEntity: { "@id": "https://smartyworkout.com/#organization" },
        }),
      },
    ],
  }),

  component: Contact,
});

function Contact() {
  const submitPublic = useServerFn(submitContactMessage);
  const submitMember = useServerFn(submitMemberMessage);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setSignedIn(Boolean(data.user)))
      .catch(() => setSignedIn(false));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!isOnline()) {
      setError("You must be online to send a message.");
      return;
    }
    setSending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      subject: String(fd.get("subject") || ""),
      message: String(fd.get("message") || ""),
    };
    try {
      const res = signedIn
        ? await submitMember({ data: payload })
        : await submitPublic({ data: payload });
      if (!res.ok) throw new Error("error" in res ? String(res.error) : "send_failed");
      setAnswered(Boolean((res as { answered?: boolean }).answered));
      setSent(true);
      form.reset();
    } catch {
      setError(`We couldn't send your message. Please email ${SUPPORT_EMAIL} directly.`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:max-w-6xl lg:px-8 lg:py-16">
      {/* Hero card */}
      <Card className="border-2 border-primary">
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <Mail className="w-12 h-12 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">
              Get in <span className="text-primary">Touch</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Questions, feedback, partnerships, or a bug? Drop us a message — we reply within{" "}
              <strong className="text-primary">24 to 48 hours</strong>.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <MiniInfo Icon={Clock} label="24–48h reply" />
              <MiniInfo Icon={MessageSquare} label="Real humans" />
              <MiniInfo Icon={ShieldCheck} label="Private" />
            </div>
          </div>
        </CardContent>
      </Card>

      {sent ? (
        <Card className="border-2 border-primary">
          <CardContent className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold text-foreground">
              {answered ? "Answered already" : "Message sent"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {answered
                ? "We already sent you a full answer by email — check your inbox now."
                : "Thanks — this one needs a human, and Haris will reply within 24–48 hours."}
              {signedIn ? " It's also waiting in your in-app inbox." : ""}
            </p>
            {signedIn && (
              <Button asChild variant="secondary" className="w-full">
                <Link to="/inbox" search={{ tab: "messages" as const, compose: false }}>Open my inbox</Link>
              </Button>
            )}
            <Button onClick={() => setSent(false)} className="w-full">
              Send another
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-primary">
          <CardContent className="p-6">
            <div className="text-center space-y-1 mb-4">
              <Send className="w-10 h-10 text-primary mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Send us a Message</h2>
              <p className="text-xs text-muted-foreground">
                {signedIn
                  ? "We answer inside the app — your reply appears in Messages and in your notifications."
                  : "Fill the form below — we'll reply to your email address."}
              </p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" name="name" required placeholder="Your full name" maxLength={120} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    maxLength={200}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject *</Label>
                <Input id="subject" name="subject" required placeholder="How can we help?" maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  maxLength={5000}
                  placeholder="Tell us what's on your mind…"
                  className="resize-none"
                />
              </div>

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={sending}>
                <Send className="w-4 h-4 mr-2" />
                {sending ? "Sending…" : "Send Message"}
              </Button>
              {signedIn && (
                <p className="text-center text-xs text-muted-foreground">
                  All your conversations live in{" "}
                  <Link to="/inbox" search={{ tab: "messages" as const, compose: false }} className="font-semibold text-primary hover:underline">
                    Messages
                  </Link>
                  .
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Direct email — independent channel */}
      <Card className="border-2 border-primary">
        <CardContent className="p-6 text-center space-y-2">
          <Mail className="w-8 h-8 text-primary mx-auto" />
          <h2 className="text-lg font-bold text-foreground">Or email us directly</h2>
          <p className="text-sm text-muted-foreground">
            Prefer your own email app? Write to us and we'll answer from there.
          </p>
          <Button asChild variant="secondary" className="w-full">
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniInfo({
  Icon,
  label,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon className="w-5 h-5 text-primary" />
      <span className="text-[11px] font-semibold text-foreground text-center leading-tight">
        {label}
      </span>
    </div>
  );
}
