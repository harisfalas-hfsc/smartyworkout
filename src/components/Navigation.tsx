import { useFreeAccessMode } from "@/hooks/useFreeAccessMode";
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
  User,
  UserCircle,
  Dumbbell,
  CalendarCheck,
  Users,
  Sun,
  Moon,
  TrendingUp,
  LogIn,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/lib/theme";
import { signOutAndClearDevice } from "@/lib/sign-out";
import { adminCheckAccess } from "@/lib/admin.functions";
import { NotificationBell } from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export function Navigation() {
  const { user, displayName, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    await signOutAndClearDevice(user?.id, user?.email);
    navigate({ to: "/", replace: true });
  }

  const accountName = displayName || user?.email || "Account";
  const initial = accountName.slice(0, 1).toUpperCase();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    void adminCheckAccess()
      .then((r) => {
        if (active) setIsAdmin(Boolean(r?.isAdmin));
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

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
              className="hidden sm:inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary text-primary hover:bg-primary/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              // Acts as the app's refresh button: go home, reload data, scroll to top.
              await router.navigate({ to: "/" });
              void router.invalidate();
              window.scrollTo({ top: 0, behavior: "auto" });
            }}
            aria-label="SmartyWorkout home and refresh"
            className="bg-transparent p-0 text-lg font-extrabold leading-none tracking-tight no-underline hover:no-underline"
            style={{ textDecoration: "none" }}
          >
            <span className="text-primary">SMARTY</span><span className="text-green-500">WORKOUT</span>
          </button>


        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!loading && user ? <NotificationBell /> : null}
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
                <DropdownMenuItem asChild>
                  <Link to="/account"><User className="h-4 w-4 mr-2" /> My account</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile"><UserCircle className="h-4 w-4 mr-2" /> Training profile</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                        <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <Shield className="h-4 w-4 mr-2" /> Admin
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuItem onSelect={() => toggleTheme()}>
                  {theme === "dark" ? (
                    <><Sun className="h-4 w-4 mr-2" /> Light mode</>
                  ) : (
                    <><Moon className="h-4 w-4 mr-2" /> Dark mode</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary text-primary hover:bg-primary/10"
                >
                  <User className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/auth"><LogIn className="h-4 w-4 mr-2" /> Sign in</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toggleTheme()}>
                  {theme === "dark" ? (
                    <><Sun className="h-4 w-4 mr-2" /> Light mode</>
                  ) : (
                    <><Moon className="h-4 w-4 mr-2" /> Dark mode</>
                  )}
                </DropdownMenuItem>

              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {menuOpen && <NavDrawer onClose={() => setMenuOpen(false)} isAuthed={!!user} isAdmin={isAdmin} />}
    </header>
  );
}

function NavDrawer({ onClose, isAuthed, isAdmin }: { onClose: () => void; isAuthed: boolean; isAdmin: boolean }) {
  const { freeAccessMode } = useFreeAccessMode();
  const sections: {
    heading: string;
    items: { to: string; label: string; Icon: typeof Home }[];
  }[] = [
    ...(isAuthed
      ? [
          {
            heading: "App",
            items: [
              { to: "/coach", label: "Smarty Coach", Icon: Sparkles },
              { to: "/wod", label: "Workout of the Day", Icon: CalendarCheck },
              { to: "/logbook", label: "Logbook", Icon: BookOpen },
              { to: "/community", label: "Smarty Community", Icon: Users },
              { to: "/progress", label: "Progress", Icon: ClipboardList },
              { to: "/profile", label: "Training profile", Icon: Info },
              { to: "/inbox", label: "Inbox & messages", Icon: Mail },
              { to: "/account", label: "My account", Icon: User },

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
        ...(isAuthed ? [] : [{ to: "/wod", label: "Workout of the Day", Icon: CalendarCheck }]),
        ...(isAuthed ? [] : [{ to: "/community", label: "Smarty Community", Icon: Users }]),
        { to: "/exercise-library", label: "Exercise Library", Icon: Dumbbell },
        { to: "/tools", label: "Tools", Icon: Wrench },
        { to: "/blog", label: "Blog", Icon: BookOpen },
        ...(freeAccessMode ? [] : [{ to: "/pricing", label: "Pricing", Icon: Crown }]),
        { to: "/faq", label: "Frequently Asked Questions", Icon: HelpCircle },
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
    {
      heading: "Discover",
      items: [{ to: "/glossary", label: "Glossary & training topics", Icon: BookOpen }],
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
        <nav
          className="flex-1 overflow-y-auto px-3"
          style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
        >
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
