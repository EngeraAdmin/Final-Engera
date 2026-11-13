import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useGlobalContent, useSettings } from "@/components/site/SiteDataContext";

/**
 * Newsletter signup.
 *
 * Once BUTTONDOWN_USERNAME is set in src/lib/site.ts, the form posts straight
 * from the visitor's browser to Buttondown's own embed endpoint (their
 * documented method for custom forms) and Buttondown shows its confirmation
 * page in a new tab. No server code, no API key, and nothing stored on this
 * site — Buttondown holds the subscriber list.
 *
 * While BUTTONDOWN_USERNAME is empty, the form confirms locally and stores
 * nothing (the original placeholder behaviour).
 */
export function NewsletterForm({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  const [email, setEmail] = useState("");
  const g = useGlobalContent();
  const username = useSettings().buttondownUsername.trim();
  const connected = username.length > 0;

  return (
    <form
      className={cn("flex flex-col gap-3 sm:flex-row", className)}
      {...(connected
        ? {
            action: `https://buttondown.com/api/emails/embed-subscribe/${encodeURIComponent(
              username,
            )}`,
            method: "post",
            target: "_blank",
          }
        : {})}
      onSubmit={(event) => {
        if (connected) {
          // Let the browser submit the form natively to Buttondown; just tidy up here.
          toast.success("Thank you — please confirm your subscription in the window that opened.");
          window.setTimeout(() => setEmail(""), 0);
          return;
        }
        event.preventDefault();
        toast.success(g.t("newsletter_thanks"));
        setEmail("");
      }}
    >
      <label className="sr-only" htmlFor="newsletter-email">
        Email address
      </label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={g.t("newsletter_placeholder")}
        className={cn(
          "h-11 flex-1 border px-4 text-sm transition-colors focus:outline-none",
          tone === "dark"
            ? "border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50 focus:border-accent-light"
            : "border-border bg-background text-primary placeholder:text-muted-foreground focus:border-accent",
        )}
      />
      {connected && <input type="hidden" name="embed" value="1" />}
      <button
        type="submit"
        className="h-11 shrink-0 cursor-pointer bg-accent px-5 text-xs font-semibold uppercase tracking-wide text-accent-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-dark"
      >
        {g.t("newsletter_button")}
      </button>
    </form>
  );
}
