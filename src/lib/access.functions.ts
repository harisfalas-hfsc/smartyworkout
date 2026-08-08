import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyAccessState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAccessStateForUser } = await import("@/lib/eligibility.server");
    return getAccessStateForUser(context.supabase as never, context.userId);
  });