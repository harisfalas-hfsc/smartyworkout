import { createServerFn } from "@tanstack/react-start";

/**
 * Public read of Global Free Access Mode, safe to call from route loaders
 * (SSR + client). Fails closed to `false` (normal paid behaviour).
 */
export const getFreeAccessMode = createServerFn({ method: "GET" }).handler(async () => {
  const { isFreeAccessMode } = await import("@/lib/free-access.server");
  return { freeAccessMode: await isFreeAccessMode() };
});
