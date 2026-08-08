import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Mail,
  Send,
  Paperclip,
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
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/contact" }],
  }),
  component: Contact,
});

function Contact() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.append("_captcha", "false");
    fd.append("_template", "table");
    fd.append(
      "_subject",
      `[SmartyWorkout] ${String(fd.get("subject") || "New contact message")}`,
    );
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${SUPPORT_EMAIL}`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("send_failed");
      setSent(true);
      form.reset();
      setFiles([]);
    } catch {
      setError(`We couldn't send your message. Please email ${SUPPORT_EMAIL} directly.`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-6 pt-4 space-y-6">
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
            <h2 className="text-xl font-bold text-foreground">Message sent</h2>
            <p className="text-sm text-muted-foreground">
              Thanks — we've received your message and will reply within 24–48 hours.
            </p>
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
                Fill the form below — we'll get back to you soon.
              </p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" name="name" required placeholder="Your full name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject *</Label>
                <Input id="subject" name="subject" required placeholder="How can we help?" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  placeholder="Tell us what's on your mind…"
                  className="resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Attachments (Optional)</Label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-sm font-semibold text-primary hover:bg-primary/10">
                  <Paperclip className="h-4 w-4" />
                  {files.length
                    ? `${files.length} file${files.length === 1 ? "" : "s"} attached`
                    : "Attach screenshots or PDFs"}
                  <input
                    type="file"
                    name="attachment"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                    className="hidden"
                  />
                </label>
                {files.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {files.map((f, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        • {f.name} ({Math.round(f.size / 1024)} KB)
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Honeypot */}
              <input
                type="text"
                name="_honey"
                style={{ display: "none" }}
                tabIndex={-1}
                autoComplete="off"
              />

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={sending}>
                <Send className="w-4 h-4 mr-2" />
                {sending ? "Sending…" : "Send Message"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Or email us directly at{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
              </p>
            </form>
          </CardContent>
        </Card>
      )}
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
