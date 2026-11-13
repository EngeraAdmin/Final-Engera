import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

import { getPageSchema } from "@/lib/content-schema";
import {
  ADMIN_SOURCE,
  isPreviewWindow,
  postToAdmin,
  setPreviewDrafts,
  type AdminToPreview,
} from "@/lib/preview";

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
}

function labelFor(ref: string): string {
  const [page = "", section = ""] = ref.split(":");
  const schema = getPageSchema(page);
  const s = schema?.sections.find((x) => x.id === section);
  if (!s) return ref;
  return page === "global" ? `${s.label} · all pages` : s.label;
}

function boxFor(el: Element | null, ref: string | null): Box | null {
  if (!el || !ref) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height, label: labelFor(ref) };
}

function findSection(ref: string): Element | null {
  return document.querySelector(`[data-section="${CSS.escape(ref)}"]`);
}

/**
 * Only active inside the admin's Site editor preview frame: outlines sections
 * on hover, reports clicks to the editor, and applies unsaved changes live.
 */
export function PreviewBridge() {
  const [active, setActive] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [hover, setHover] = useState<Box | null>(null);
  const [selected, setSelected] = useState<Box | null>(null);
  const hoverRef = useRef<{ el: Element; ref: string } | null>(null);
  const selectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isPreviewWindow()) return;
    setActive(true);
    document.documentElement.classList.add("engera-preview");

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const msg = event.data as AdminToPreview | undefined;
      if (!msg || msg.source !== ADMIN_SOURCE) return;
      if (msg.type === "drafts") setPreviewDrafts(msg.drafts);
      if (msg.type === "select") {
        selectedRef.current = msg.section;
        const el = msg.section ? findSection(msg.section) : null;
        if (el && msg.scroll) {
          const top = el.getBoundingClientRect().top + window.scrollY - 90;
          window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        }
        setSelected(boxFor(el, msg.section));
      }
    }

    function onMove(event: MouseEvent) {
      const el = (event.target as Element | null)?.closest?.("[data-section]") ?? null;
      const ref = el?.getAttribute("data-section") ?? null;
      hoverRef.current = el && ref ? { el, ref } : null;
      setHover(boxFor(el, ref));
    }

    function onLeave() {
      hoverRef.current = null;
      setHover(null);
    }

    function onClick(event: MouseEvent) {
      const el = (event.target as Element | null)?.closest?.("[data-section]");
      const ref = el?.getAttribute("data-section");
      // In the editor, clicks select sections instead of following links/buttons.
      event.preventDefault();
      event.stopPropagation();
      if (!ref) return;
      selectedRef.current = ref;
      setSelected(boxFor(el ?? null, ref));
      postToAdmin({ source: "engera-preview", type: "select", section: ref });
    }

    function refresh() {
      if (hoverRef.current) setHover(boxFor(hoverRef.current.el, hoverRef.current.ref));
      const sel = selectedRef.current;
      if (sel) setSelected(boxFor(findSection(sel), sel));
    }

    window.addEventListener("message", onMessage);
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("click", onClick, true);
    const onSubmit = (e: Event) => e.preventDefault();
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("scroll", refresh, true);
    window.addEventListener("resize", refresh);
    const timer = window.setInterval(refresh, 400);

    postToAdmin({ source: "engera-preview", type: "ready", path: window.location.pathname });

    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("scroll", refresh, true);
      window.removeEventListener("resize", refresh);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (active) postToAdmin({ source: "engera-preview", type: "location", path: pathname });
  }, [active, pathname]);

  if (!active) return null;

  const showHover =
    hover && (!selected || hover.label !== selected.label || hover.top !== selected.top);

  return (
    <>
      {showHover && <Outline box={hover} variant="hover" />}
      {selected && <Outline box={selected} variant="selected" />}
    </>
  );
}

function Outline({ box, variant }: { box: Box; variant: "hover" | "selected" }) {
  const color = variant === "selected" ? "#116dff" : "#5a9bff";
  const labelTop = box.top < 26 ? box.top + 2 : box.top - 24;
  return (
    <div
      aria-hidden
      style={{ pointerEvents: "none", position: "fixed", inset: 0, zIndex: 2147483000 }}
    >
      <div
        style={{
          position: "fixed",
          top: box.top,
          left: box.left,
          width: box.width,
          height: box.height,
          border: `2px ${variant === "selected" ? "solid" : "dashed"} ${color}`,
          background: variant === "selected" ? "rgba(17,109,255,0.04)" : "transparent",
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: labelTop,
          left: Math.max(box.left, 4),
          background: color,
          color: "white",
          font: "600 12px/1 Inter, system-ui, sans-serif",
          padding: "5px 8px",
          borderRadius: 4,
          whiteSpace: "nowrap",
          boxShadow: "0 2px 6px rgba(0,0,0,.2)",
        }}
      >
        {variant === "selected" ? "✎ " : ""}
        {box.label}
      </div>
    </div>
  );
}
