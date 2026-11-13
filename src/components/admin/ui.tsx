/**
 * Small building blocks shared by every admin screen, so they all look and
 * behave the same.
 */
import { forwardRef, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** Puts the admin font on dialogs/menus too (they render outside the admin layout). */
export function useAdminMode() {
  useEffect(() => {
    document.documentElement.classList.add("admin-mode");
    return () => document.documentElement.classList.remove("admin-mode");
  }, []);
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "dark";

/** Button look, for links that should look like buttons. */
export function btnClass(
  variant: BtnVariant = "secondary",
  size: "sm" | "md" | "icon" = "md",
  className?: string,
) {
  return cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#116dff] disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" && "h-8 px-3.5 text-[13px]",
    size === "md" && "h-10 px-5 text-sm",
    size === "icon" && "size-9",
    variant === "primary" && "bg-[#116dff] text-white hover:bg-[#0b5ad6]",
    variant === "dark" && "bg-[#1e2635] text-white hover:bg-black",
    variant === "secondary" &&
      "border border-[#d5dbe3] bg-white text-[#1e2635] hover:border-[#116dff] hover:text-[#116dff]",
    variant === "ghost" && "text-[#3b4658] hover:bg-[#eef1f5]",
    variant === "danger" && "bg-[#e5484d] text-white hover:bg-[#cf3a3f]",
    className,
  );
}

export const Btn = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: BtnVariant;
    size?: "sm" | "md" | "icon";
    loading?: boolean;
  }
>(function Btn(
  { variant = "secondary", size = "md", loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={btnClass(variant, size, className)}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[#e3e7ed] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eef1f5] px-6 py-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-[#1e2635]">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-[#69758a]">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children !== undefined && <div className="px-6 py-5">{children}</div>}
    </section>
  );
}

export function FieldShell({
  label,
  help,
  error,
  htmlFor,
  aside,
  children,
  className,
}: {
  label: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-[#3b4658]">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {help && !error && <p className="text-xs leading-relaxed text-[#7b879b]">{help}</p>}
      {error && <p className="text-xs text-[#e5484d]">{error}</p>}
    </div>
  );
}

const inputBase =
  "w-full rounded-lg border border-[#d5dbe3] bg-white px-3 text-sm text-[#1e2635] placeholder:text-[#a3adbd] transition-colors hover:border-[#b7c0cd] focus:border-[#116dff] focus:outline-none focus:ring-3 focus:ring-[#116dff]/15";

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(inputBase, "h-10", className)} {...rest} />;
  },
);

/** A textarea that grows with its content. */
export function AutoTextarea({
  className,
  minRows = 2,
  value,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight + 2, 520)}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      className={cn(inputBase, "resize-none py-2.5 leading-relaxed", className)}
      {...rest}
    />
  );
}

export function Badge({
  tone = "gray",
  children,
  className,
}: {
  tone?: "gray" | "blue" | "green" | "amber" | "red";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "gray" && "bg-[#eef1f5] text-[#4d596c]",
        tone === "blue" && "bg-[#e7f0ff] text-[#0b5ad6]",
        tone === "green" && "bg-[#e3f6ec] text-[#13804b]",
        tone === "amber" && "bg-[#fff3d6] text-[#94600a]",
        tone === "red" && "bg-[#fde8e8] text-[#c4282d]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#cfd6e0] bg-white px-6 py-14 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#e7f0ff] text-[#116dff]">
        {icon}
      </div>
      <p className="font-semibold text-[#1e2635]">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-[#69758a]">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Warn before leaving the browser tab with unsaved changes. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}

export function formatWhen(value: string | null | undefined): string {
  if (!value) return "";
  // D1/SQLite datetime('now') is UTC without a zone marker.
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return value;
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatBytes(n: number | null | undefined): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
