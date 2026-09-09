import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  Menu,
  X,
  Home,
  Sparkles,
  CalendarCheck,
  BookOpen,
  Users,
  ClipboardList,
  Info,
  Mail,
  User,
  Crown,
  HelpCircle,
  Dumbbell,
  Wrench,
  Shield,
  LogOut,
  UserCircle,
  Sun,
  Moon,
  ChevronLeft,
  LogIn,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/lib/theme";
import { useFreeAccessMode } from "@/hooks/useFreeAccessMode";
import { NotificationBell } from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBrand } from "@/lib/brand-context";
import { adminCheckAccess } from "@/lib/admin.functions";


export function Navigation() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const brand = useBrand();

  useEffect(() => {
    let active = true;
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
  }, []);

  const accountName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const initial = (accountName || "?").charAt(0).toUpperCase();

  const handleSignOut = async () => {

    await supabase.auth.signOut();
    await router.navigate({ to: "/" });
  };

  // Split the short name so the first part keeps the primary color and the
  // second part keeps the accent color (SMARTY + WORKOUT / GYM).
  const firstPart = brand.shortName.slice(0, 6).toUpperCase();
  const secondPart = brand.shortName.slice(6).toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          {router.state.location.pathname !== "/" && (
            <button
              type="button"
              onClick={() => router.history.back()}
              aria-label="Go back"
              className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground"
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
            aria-label={`${brand.name} home and refresh`}
            className="bg-transparent p-0 text-lg font-extrabold leading-none tracking-tight no-underline hover:no-underline"
            style={{ textDecoration: "none" }}
          >
            {brand.id === "smartygym" ? (
              <img src={brand.logo} alt="SmartyGym" className="h-8 w-auto max-w-[148px] object-contain" />
            ) : (
              <>
                <span className="text-primary">{firstPart}</span>
                <span className="text-green-500">{secondPart}</span>
              </>
            )}
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
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <Shield className="h-4 w-4 mr-2" /> Admin
                    </Link>
                  </DropdownMenuItem>
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
  const brand = useBrand();
  const coachLabel = brand.coachName.charAt(0).toUpperCase() + brand.coachName.slice(1);

  const sections: {
    heading: string;
    items: { to: string; label: string; Icon: typeof Home }[];
  }[] = [
    ...(isAuthed
      ? [
          {
            heading: "App",
            items: [
              { to: "/coach", label: coachLabel, Icon: Sparkles },
              { to: "/wod", label: "Workout of the Day", Icon: CalendarCheck },
              { to: "/logbook", label: "Logbook", Icon: BookOpen },
              { to: "/community", label: brand.communityName, Icon: Users },
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
      heading: brand.name,
      items: [
        { to: "/", label: "Home", Icon: Home },
        { to: "/about", label: "About", Icon: Info },
        { to: "/how-it-works", label: "How It Works", Icon: BookOpen },
        ...(isAuthed ? [] : [{ to: "/wod", label: "Workout of the Day", Icon: CalendarCheck }]),
        ...(isAuthed ? [] : [{ to: "/community", label: brand.communityName, Icon: Users }]),
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

  const firstPart = brand.shortName.slice(0, 6).toUpperCase();
  const secondPart = brand.shortName.slice(6).toUpperCase();

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside
        className="absolute left-0 top-0 flex h-full w-[85%] max-w-[340px] flex-col bg-background shadow-2xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-12 items-center justify-between px-4">
          <div className="text-base font-extrabold">
            <span className="text-primary">{firstPart}</span>
            <span className="text-green-500">{secondPart}</span>
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
