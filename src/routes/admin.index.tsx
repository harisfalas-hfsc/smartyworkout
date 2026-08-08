import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  Users,
  CreditCard,
  TrendingUp,
  Search,
  Loader2,
  Plus,
  Minus,
  Crown,
} from "lucide-react";
import { isAdminEmail } from "@/lib/admin";
import {
  adminListUsers,
  adminGrantCredits,
  adminSetRole,
  type AdminUserRow,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({ component: AdminPage });

function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setAuthed(isAdminEmail(data.user?.email)))
      .catch(() => setAuthed(false));
  }, []);
  if (authed === null) {
    return (
      <Shell>
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }
  if (!authed) {
    return (
      <Shell>
        <div className="mx-auto mt-10 max-w-sm rounded-3xl border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold">Admin access only</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This area is restricted to SmartyWorkout administrators.
          </p>
        </div>
      </Shell>
    );
  }
  return (
    <Shell>
      <AdminInner />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background text-foreground">
      
      <main className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-4 lg:px-8">{children}</main>
    </div>
  );
}

function AdminInner() {
  const listUsers = useServerFn(adminListUsers);
  const grantCredits = useServerFn(adminGrantCredits);
  const setRole = useServerFn(adminSetRole);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grantUser, setGrantUser] = useState<AdminUserRow | null>(null);
  const [grantCount, setGrantCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reloadUsers() {
    setUsersLoading(true);
    const r = await listUsers({
      data: { search: search.trim() || undefined },
    });
    if ("error" in r) setMessage(r.error);
    else setUsers(r.users);
    setUsersLoading(false);
  }
  useEffect(() => {
    void reloadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSubs = useMemo(() => users.filter((u) => u.has_active_subscription), [users]);
  const withPurchases = useMemo(() => users.filter((u) => u.purchases > 0), [users]);

  async function doGrant(delta: number) {
    if (!grantUser) return;
    setBusy(true);
    const r = await grantCredits({ data: { userId: grantUser.id, credits: delta } });
    setBusy(false);
    if ("error" in r) setMessage(r.error);
    else {
      setMessage(`Updated ${grantUser.email}: now ${r.credits} credits`);
      setGrantUser(null);
      void reloadUsers();
    }
  }
  async function toggleAdmin(u: AdminUserRow) {
    if (isAdminEmail(u.email)) {
      setMessage("This user is admin by email allowlist (edit src/lib/admin.ts to change).");
      return;
    }
    setBusy(true);
    const r = await setRole({ data: { userId: u.id, makeAdmin: !u.is_admin } });
    setBusy(false);
    if ("error" in r) setMessage(r.error);
    else {
      setMessage(`${u.email} is now ${!u.is_admin ? "admin" : "regular user"}`);
      void reloadUsers();
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Admin panel</h1>
          <p className="text-sm text-muted-foreground">Users, credits and roles</p>
        </div>
      </div>
      {message && (
        <div className="mb-4 rounded-2xl bg-primary/10 p-3 text-sm font-semibold text-foreground">
          {message}{" "}
          <button onClick={() => setMessage(null)} className="ml-2 text-xs underline">
            dismiss
          </button>
        </div>
      )}

      <div className="mb-4">
        <Button asChild variant="outline">
          <Link to="/admin/exercise-library">Upload exercise library</Link>
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">
            <TrendingUp className="mr-1 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-1 h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="subs">
            <Crown className="mr-1 h-4 w-4" />
            Subs
          </TabsTrigger>
          <TabsTrigger value="purchases">
            <CreditCard className="mr-1 h-4 w-4" />
            Purchases
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab users={users} loading={usersLoading} onReload={reloadUsers} />
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle>All users ({users.length})</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="email…"
                    className="h-9 w-48 pl-8"
                    onKeyDown={(e) => e.key === "Enter" && reloadUsers()}
                  />
                </div>
                <Button size="sm" onClick={reloadUsers} disabled={usersLoading}>
                  {usersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reload"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <UserTable
                users={users}
                onGrant={(u) => {
                  setGrantUser(u);
                  setGrantCount(1);
                }}
                onToggleAdmin={toggleAdmin}
                busy={busy}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subs">
          <Card>
            <CardHeader>
              <CardTitle>Active subscribers ({activeSubs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <UserTable
                users={activeSubs}
                onGrant={(u) => {
                  setGrantUser(u);
                  setGrantCount(1);
                }}
                onToggleAdmin={toggleAdmin}
                busy={busy}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Users with purchases ({withPurchases.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <UserTable
                users={withPurchases}
                onGrant={(u) => {
                  setGrantUser(u);
                  setGrantCount(1);
                }}
                onToggleAdmin={toggleAdmin}
                busy={busy}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!grantUser} onOpenChange={(o) => !o && setGrantUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Grant credits</DialogTitle>
          </DialogHeader>
          {grantUser && (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-semibold">{grantUser.email}</div>
                <div className="text-muted-foreground">
                  Currently: {grantUser.credits} credits
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGrantCount((c) => Math.max(1, c - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={grantCount}
                  onChange={(e) => setGrantCount(Number(e.target.value) || 1)}
                  className="text-center"
                />
                <Button variant="outline" size="sm" onClick={() => setGrantCount((c) => c + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => grantUser && doGrant(-grantCount)}
              disabled={busy}
            >
              Remove {grantCount}
            </Button>
            <Button onClick={() => doGrant(grantCount)} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Grant ${grantCount}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OverviewTab({
  users,
  loading,
  onReload,
}: {
  users: AdminUserRow[];
  loading: boolean;
  onReload: () => void;
}) {
  const totalCredits = users.reduce((s, u) => s + u.credits, 0);
  const admins = users.filter((u) => u.is_admin).length;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Total users" value={String(users.length)} />
        <Stat label="Bonus credits outstanding" value={String(totalCredits)} />
        <Stat label="Admins" value={String(admins)} />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Overview</CardTitle>
          <Button size="sm" variant="outline" onClick={onReload} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            SmartyWorkout plans are free — manage users, credits and roles here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-2xl font-extrabold">{value}</div>
      </CardContent>
    </Card>
  );
}

function UserTable({
  users,
  onGrant,
  onToggleAdmin,
  busy,
}: {
  users: AdminUserRow[];
  onGrant: (u: AdminUserRow) => void;
  onToggleAdmin: (u: AdminUserRow) => void;
  busy: boolean;
}) {
  if (!users.length)
    return <p className="py-6 text-center text-sm text-muted-foreground">No users.</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Age</TableHead>
            <TableHead className="text-right">Credits</TableHead>
            <TableHead className="text-right">Purchases</TableHead>
            <TableHead>Subscription</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="whitespace-nowrap">Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="text-xs">{u.email || "—"}</TableCell>
              <TableCell className="text-xs">{u.name || "—"}</TableCell>
              <TableCell className="text-right font-mono text-xs">{u.age ?? "—"}</TableCell>
              <TableCell className="text-right font-mono text-xs">{u.credits}</TableCell>
              <TableCell className="text-right font-mono text-xs">{u.purchases}</TableCell>
              <TableCell>
                {u.has_active_subscription ? (
                  <Badge>{u.subscription_status ?? "active"}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {u.is_admin ? (
                  <Badge variant="default">
                    <Crown className="mr-1 h-3 w-3" />
                    admin
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">user</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {new Date(u.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onGrant(u)}
                    disabled={busy}
                  >
                    credits
                  </Button>
                  {!isAdminEmail(u.email) && (
                    <Button
                      size="sm"
                      variant={u.is_admin ? "outline" : "secondary"}
                      onClick={() => onToggleAdmin(u)}
                      disabled={busy}
                    >
                      {u.is_admin ? "revoke" : "make admin"}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
