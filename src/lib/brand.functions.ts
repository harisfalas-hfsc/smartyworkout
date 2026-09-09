import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { resolveBrand } from "./brand";

/**
 * Resolve the active brand from the incoming request host.
 * Safe to call from route loaders (SSR + client).
 */
export const getBrand = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const host = request?.headers?.get("host") ?? null;
  return resolveBrand(host);
});
