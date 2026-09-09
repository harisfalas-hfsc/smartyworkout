import { createContext, useContext, type ReactNode } from "react";
import type { BrandConfig, BrandId } from "./brand";
import { BRANDS, DEFAULT_BRAND_ID } from "./brand";

const BrandContext = createContext<BrandConfig>(BRANDS[DEFAULT_BRAND_ID]);

export function BrandProvider({
  brand,
  children,
}: {
  brand?: BrandConfig | BrandId;
  children: ReactNode;
}) {
  const config =
    typeof brand === "string" ? BRANDS[brand] ?? BRANDS[DEFAULT_BRAND_ID] : brand ?? BRANDS[DEFAULT_BRAND_ID];
  return <BrandContext.Provider value={config}>{children}</BrandContext.Provider>;
}

export function useBrand(): BrandConfig {
  return useContext(BrandContext);
}
