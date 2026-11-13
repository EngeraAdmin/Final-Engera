import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NewsletterForm } from "@/components/site/Newsletter";
import { BrandLogo } from "@/components/site/BrandLogo";
import { NAV_LINKS } from "@/lib/site";
import { str } from "@/lib/content-schema";
import { useGlobalContent, useSiteData, useSocialLinks } from "@/components/site/SiteDataContext";

const socialIcons = {
  LinkedIn: Linkedin,
  Instagram: Instagram,
  Facebook: Facebook,
} as const;

export function Footer() {
  const { facilities, settings } = useSiteData();
  const socialLinks = useSocialLinks();
  const g = useGlobalContent();
  const worldwide = g
    .list("footer_worldwide_links")
    .map((l) => ({ label: str(l["label"]), url: str(l["url"]) }))
    .filter((l) => l.label && l.url);

  return (
    <footer data-section="global:footer" className="site-footer bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
        <div>
          <BrandLogo light className="[&_img]:h-10" usaClassName="text-primary-foreground" />
          <p className="mt-4 max-w-sm text-sm text-primary-foreground/75">{g.t("footer_blurb")}</p>
          <Button asChild variant="donate" className="mt-6">
            <a href={settings.donateUrl} target="_blank" rel="noreferrer">
              {g.t("footer_donate_label")}
            </a>
          </Button>

          <div className="mt-8">
            <p className="eyebrow text-accent-light">{g.t("footer_newsletter_heading")}</p>
            <p className="mt-3 max-w-sm text-sm text-primary-foreground/75">
              {g.t("footer_newsletter_text")}
            </p>
            <NewsletterForm className="mt-4 max-w-sm" />
          </div>

          <div className="mt-8 flex items-center gap-3">
            {socialLinks.map((social) => {
              const Icon = socialIcons[social.label as keyof typeof socialIcons];
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="flex size-11 items-center justify-center border border-primary-foreground/25 text-primary-foreground/85 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-light hover:text-accent-light"
                >
                  <Icon className="size-5" aria-hidden />
                </a>
              );
            })}
          </div>
        </div>

        <nav aria-label="Footer">
          <p className="eyebrow text-accent-light">{g.t("footer_explore_heading")}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-primary-foreground/80 transition-colors hover:text-accent-light"
                >
                  {g.t(link.contentKey)}
                </Link>
              </li>
            ))}
          </ul>

          {worldwide.length > 0 && (
            <>
              <p className="eyebrow mt-8 text-accent-light">{g.t("footer_worldwide_heading")}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {worldwide.map((l) => (
                  <li key={l.label + l.url}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-foreground/80 transition-colors hover:text-accent-light"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        <div>
          <p className="eyebrow text-accent-light">{g.t("footer_facilities_heading")}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {facilities.map((f) => (
              <li key={f.slug}>
                <Link
                  to="/projects/$slug"
                  params={{ slug: f.slug }}
                  className="text-primary-foreground/80 transition-colors hover:text-accent-light"
                >
                  {f.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-primary-foreground/60 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>
            © {new Date().getFullYear()} {g.t("footer_copyright")}
          </p>
          <p>
            {[settings.email, settings.phone, settings.address].filter(Boolean).join(" · ")} ·{" "}
            {g.t("footer_sister_text")}{" "}
            <a
              href={g.t("footer_sister_url")}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-accent-light"
            >
              {g.t("footer_sister_name")}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
