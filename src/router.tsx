import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { bootNativeShell } from "./lib/offline/native-boot";

export const getRouter = () => {
  // Restore the native device session before protected beforeLoad guards run.
  // Calling this in a mounted effect is too late on an offline cold start.
  bootNativeShell();
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
