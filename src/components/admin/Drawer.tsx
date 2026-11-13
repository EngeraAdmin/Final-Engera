import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/** A panel that slides in from the right — used for editing one item. */
export function Drawer({
  open,
  onOpenChange,
  title,
  subtitle,
  headerExtra,
  footer,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  headerExtra?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0f1a2e]/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white font-sans text-[#1e2635] shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
            wide ? "sm:max-w-2xl" : "sm:max-w-xl",
          )}
        >
          <div className="flex items-start gap-3 border-b border-[#e3e7ed] px-6 py-4">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate text-lg font-semibold">
                {title}
              </DialogPrimitive.Title>
              {subtitle ? (
                <DialogPrimitive.Description className="mt-0.5 text-[13px] text-[#69758a]">
                  {subtitle}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">Edit</DialogPrimitive.Description>
              )}
            </div>
            {headerExtra}
            <DialogPrimitive.Close
              className="cursor-pointer rounded-lg p-2 text-[#69758a] hover:bg-[#eef1f5] hover:text-[#1e2635]"
              aria-label="Close"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="admin-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center gap-2 border-t border-[#e3e7ed] bg-[#fafbfc] px-6 py-3">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Tabs inside a drawer. */
export function DrawerTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; badge?: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-[#e3e7ed] bg-white px-4">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
            value === t.id
              ? "border-[#116dff] text-[#116dff]"
              : "border-transparent text-[#5b677b] hover:text-[#1e2635]",
          )}
        >
          {t.label}
          {t.badge}
        </button>
      ))}
    </div>
  );
}
