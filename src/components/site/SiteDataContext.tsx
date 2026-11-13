import { createContext, useContext, type ReactNode } from "react";

import type { SiteData } from "@/lib/site-data";
import { socialLinksFor } from "@/lib/site-data";
import { usePageContent } from "@/lib/preview";
import type { PageContent } from "@/lib/content-schema";

const SiteDataContext = createContext<SiteData | null>(null);

/**
 * Gives every public page/component the facilities, testimonials, site-wide
 * settings and shared header/footer content loaded once at the root (see
 * getSiteDataServerFn in lib/site-data.ts).
 */
export function SiteDataProvider({ value, children }: { value: SiteData; children: ReactNode }) {
  return <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteData {
  const value = useContext(SiteDataContext);
  if (!value) {
    throw new Error("useSiteData must be used inside the public site layout (SiteDataProvider).");
  }
  return value;
}

export const useFacilities = () => useSiteData().facilities;
export const useTestimonials = () => useSiteData().testimonials;
export const useSettings = () => useSiteData().settings;
export function useSocialLinks() {
  return socialLinksFor(useSiteData().settings);
}

/** The shared "Header & footer" content (menu labels, footer, donate banner, figures…). */
export function useGlobalContent(): PageContent {
  return usePageContent("global", useSiteData().global);
}

/** Values for {donate} / {email} placeholders in editable links. */
export function useLinkVars() {
  const { donateUrl, email } = useSettings();
  return { donate: donateUrl, email };
}
