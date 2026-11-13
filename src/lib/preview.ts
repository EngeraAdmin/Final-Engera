/**
 * Live preview between the admin's Site editor and the public pages.
 *
 * The editor shows the real website inside an <iframe name="engera-preview">.
 * Inside that frame the public pages:
 *   - receive the editor's unsaved changes ("drafts") and render them
 *     instantly, and
 *   - report which section was clicked, so the editor can open it.
 * Outside the editor (every normal visitor) none of this does anything.
 */
import { useMemo, useSyncExternalStore } from "react";

import { contentOf, type PageContent } from "@/lib/content-schema";

export const PREVIEW_WINDOW_NAME = "engera-preview";
export const ADMIN_SOURCE = "engera-admin";
export const PREVIEW_SOURCE = "engera-preview";

export type Drafts = Record<string, Record<string, string>>;

export type AdminToPreview =
  | { source: typeof ADMIN_SOURCE; type: "drafts"; drafts: Drafts }
  | { source: typeof ADMIN_SOURCE; type: "select"; section: string | null; scroll?: boolean };

export type PreviewToAdmin =
  | { source: typeof PREVIEW_SOURCE; type: "ready"; path: string }
  | { source: typeof PREVIEW_SOURCE; type: "select"; section: string }
  | { source: typeof PREVIEW_SOURCE; type: "location"; path: string };

export function isPreviewWindow(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.name === PREVIEW_WINDOW_NAME && window.parent !== window;
  } catch {
    return false;
  }
}

let drafts: Drafts = {};
const listeners = new Set<() => void>();

export function setPreviewDrafts(next: Drafts) {
  drafts = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function usePreviewDraft(page: string): Record<string, string> | undefined {
  return useSyncExternalStore(
    subscribe,
    () => drafts[page],
    () => undefined,
  );
}

/**
 * A page's content (saved values from the loader), with the editor's unsaved
 * changes layered on top while previewing.
 */
export function usePageContent(page: string, raw: Record<string, string> | undefined): PageContent {
  const draft = usePreviewDraft(page);
  return useMemo(() => contentOf(page, draft ? { ...raw, ...draft } : raw), [page, raw, draft]);
}

export function postToAdmin(message: PreviewToAdmin) {
  if (!isPreviewWindow()) return;
  window.parent.postMessage(message, window.location.origin);
}
