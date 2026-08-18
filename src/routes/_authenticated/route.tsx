import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isOnline } from "@/lib/offline/connectivity";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Offline / network failure: trust the session saved on the device so the
    // member keeps access to their saved logbook, workouts and player.
    const offline = !isOnline();
    if (offline) {
      const { data: local } = await supabase.auth.getSession();
      if (local.session?.user) return { user: local.session.user };
      throw redirect({ to: "/auth" });
    }
    try {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) return { user: data.user };
      if (error) throw error;
    } catch {
      const { data: local } = await supabase.auth.getSession();
      if (local.session?.user) return { user: local.session.user };
    }
    throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});

