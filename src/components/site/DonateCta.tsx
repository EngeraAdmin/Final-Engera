import { Button } from "@/components/ui/button";
import { useGlobalContent, useSettings } from "@/components/site/SiteDataContext";
import { cn } from "@/lib/utils";

/**
 * Navy donate banner that sits flush above the footer. The `donate-cta` class
 * lets the footer drop its top margin and add a hairline divider site-wide.
 */
export function DonateCta({
  heading,
  body,
  label,
  className,
}: {
  heading?: string;
  body?: string;
  label?: string;
  className?: string;
}) {
  const { donateUrl } = useSettings();
  const g = useGlobalContent();
  return (
    <section
      data-section="global:cta"
      className={cn(
        "donate-cta group bg-primary text-primary-foreground transition-[background-color,box-shadow] duration-300 hover:bg-primary-light hover:shadow-[inset_0_0_80px_rgba(255,255,255,0.08)]",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-16 md:flex-row md:items-center md:justify-between md:py-20 lg:px-8">
        <div>
          <h2 className="font-display text-3xl md:text-4xl">{heading ?? g.t("cta_heading")}</h2>
          <p className="mt-3 max-w-xl text-primary-foreground/80">{body ?? g.t("cta_body")}</p>
        </div>
        <Button
          asChild
          variant="donate"
          size="lg"
          className="transition-transform duration-300 group-hover:scale-105"
        >
          <a href={donateUrl} target="_blank" rel="noreferrer">
            {label ?? g.t("cta_label")}
          </a>
        </Button>
      </div>
    </section>
  );
}
