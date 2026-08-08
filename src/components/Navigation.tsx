import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LogOut,
  Menu,
  X,
  Home,
  Wrench,
  Crown,
  Info,
  Mail,
  HelpCircle,
  Shield,
  FileText,
  AlertTriangle,
  ClipboardList,
  Sparkles,
  BookOpen,
  ChevronLeft,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export function Navigation() {
  const { user, displayName, loading } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [navCount, setNavCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = router.subscribe("onResolved", () => {
      setNavCount((n) => n + 1);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const canGoBack = navCount > 0 && pathname !== "/";

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const accountName = displayName || user?.email || "Account";
  const initial = accountName.slice(0, 1).toUpperCase();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <header
      className="sticky top-0 z-40 w-full bg-background"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-11 items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10"
          >
            <Menu className="h-5 w-5" />
          </button>
          {canGoBack && (
            <button
              type="button"
              onClick={() => router.history.back()}
              aria-label="Go back"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary text-primary hover:bg-primary/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <Link
            to="/"
            aria-label="SmartyWorkout home"
            className="text-lg font-extrabold tracking-tight leading-none no-underline hover:no-underline"
            style={{ textDecoration: "none" }}
          >
            <span className="text-primary">SMARTY</span><span className="text-green-500">WORKOUT</span>
          </Link>

        </div>

        <div className="flex shrink-0 items-center gap-2">
          {loading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-primary text-xs font-bold text-primary-foreground"
                >
                  {initial}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="space-y-0.5">
                  <span className="block truncate">{accountName}</span>
                  {user.email && accountName !== user.email && (
                    <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/coach">Smarty Coach</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/logbook">Logbook</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/progress">Progress</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile">Training profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/plans">My plans</Link>
                </DropdownMenuItem>

                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <Shield className="h-4 w-4 mr-2" /> Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                to="/auth"
                className="inline-flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 text-xs font-semibold text-foreground/80 no-underline hover:text-primary hover:no-underline"
                style={{ textDecoration: "none" }}
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" } as never}
                className="inline-flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-full border-2 border-primary px-3 text-xs font-semibold text-primary no-underline transition-colors hover:bg-primary hover:text-primary-foreground hover:no-underline"
                style={{ textDecoration: "none" }}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      {menuOpen && <NavDrawer onClose={() => setMenuOpen(false)} isAuthed={!!user} isAdmin={isAdmin} />}
    </header>
  );
}

function NavDrawer({ onClose, isAuthed, isAdmin }: { onClose: () => void; isAuthed: boolean; isAdmin: boolean }) {
  const sections: {
    heading: string;
    items: { to: string; label: string; Icon: typeof Home }[];
  }[] = [
    ...(isAuthed
      ? [
          {
            heading: "App",
            items: [
              { to: "/plans", label: "My plans", Icon: ClipboardList },
              { to: "/questionnaire", label: "New plan", Icon: Sparkles },
              ...(isAdmin ? [{ to: "/admin", label: "Admin", Icon: Shield }] : []),
            ],
          },
        ]
      : []),
    {
      heading: "SmartyWorkout",
      items: [
        { to: "/", label: "Home", Icon: Home },
        { to: "/about", label: "About", Icon: Info },
        { to: "/how-it-works", label: "How It Works", Icon: BookOpen },
        { to: "/pricing", label: "Pricing", Icon: Crown },
        { to: "/tools", label: "Tools", Icon: Wrench },
        { to: "/faq", label: "Frequently Asked Questions", Icon: HelpCircle },
        { to: "/training-science", label: "The Diet Science", Icon: BookOpen },
        { to: "/training-intelligence", label: "Training Intelligence", Icon: Sparkles },
        { to: "/contact", label: "Contact", Icon: Mail },

      ],
    },
    {
      heading: "Legal",
      items: [
        { to: "/privacy", label: "Privacy Policy", Icon: Shield },
        { to: "/terms", label: "Terms of Service", Icon: FileText },
        { to: "/disclaimer", label: "Disclaimer", Icon: AlertTriangle },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside
        className="absolute left-0 top-0 flex h-full w-[85%] max-w-[340px] flex-col bg-background shadow-2xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-12 items-center justify-between px-4">
          <div className="text-base font-extrabold">
            <span className="text-primary">SMARTY</span><span className="text-green-500">WORKOUT</span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {sections.map((s) => (
            <div key={s.heading} className="mt-2">
              <div className="px-2 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {s.heading}
              </div>
              <ul className="space-y-1">
                {s.items.map(({ to, label, Icon }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-primary/10"
                      style={{ textDecoration: "none" }}
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-xl brand-gradient-soft text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
}
