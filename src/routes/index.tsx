import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { StatGrid, statsFrom } from "@/components/site/StatCounter";
import { FacilityCard } from "@/components/site/FacilityCard";
import { Reveal } from "@/components/site/Reveal";
import { NewsletterForm } from "@/components/site/Newsletter";
import { DonateCta } from "@/components/site/DonateCta";
import { PhotoAlbum } from "@/components/site/PhotoAlbum";
import { ScrollYouTube } from "@/components/site/ScrollYouTube";
import { useGlobalContent, useSiteData } from "@/components/site/SiteDataContext";
import { getPublicPageContentServerFn } from "@/lib/page-content";
import { usePageContent } from "@/lib/preview";
import { pageHead } from "@/lib/seo";
import { str, youtubeId } from "@/lib/content-schema";
import { mediaUrl } from "@/lib/media-library";

export const Route = createFileRoute("/")({
  loader: async () => getPublicPageContentServerFn({ data: { page: "home" } }),
  head: ({ loaderData }) => pageHead("home", loaderData, "https://engra-heart-map.lovable.app/"),
  component: Home,
});

function Home() {
  const c = usePageContent("home", Route.useLoaderData());
  const g = useGlobalContent();
  const { facilities, settings } = useSiteData();
  const services = c.list("services").map((s) => ({
    title: str(s["title"]),
    body: str(s["body"]),
    photos: [
      { src: mediaUrl(str(s["photo"])), alt: str(s["photo_alt"]) },
      { src: mediaUrl(str(s["photo2"])), alt: str(s["photo2_alt"]) },
    ].filter((p) => p.src),
  }));
  const whereCount = Number(c.t("where_count")) || 3;

  return (
    <>
      {/* Hero */}
      <section
        data-section="home:hero"
        className="relative isolate overflow-hidden bg-primary text-primary-foreground"
      >
        {c.img("hero_image") && (
          <img
            src={c.img("hero_image")}
            alt={c.t("hero_image_alt")}
            className="absolute inset-0 h-full w-full scale-105 object-cover opacity-45"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, color-mix(in oklab, var(--primary-dark) 88%, transparent) 0%, color-mix(in oklab, var(--primary) 55%, transparent) 65%, transparent 100%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 py-24 md:py-36 lg:px-8">
          <Reveal>
            <p className="eyebrow text-accent-light">{c.t("hero_eyebrow")}</p>
            <h1 className="display-xl mt-5 max-w-3xl text-4xl md:text-6xl lg:text-[4.25rem]">
              {c.t("hero_heading")}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/85 md:text-lg">
              {c.t("hero_subtext")}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild variant="donate" size="lg">
                <a href={settings.donateUrl} target="_blank" rel="noreferrer">
                  {c.t("hero_primary_label")}
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="editorial"
                className="border-primary-foreground/40 text-primary-foreground hover:border-accent-light hover:text-accent-light"
              >
                <Link to="/projects">{c.t("hero_secondary_label")}</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Mission */}
      {c.visible("mission") && (
        <section data-section="home:mission" className="pattern-weave">
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-28 lg:px-8">
            <Reveal className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
              <div>
                <p className="eyebrow text-accent">{c.t("mission_eyebrow")}</p>
                <h2 className="mt-5 font-display text-3xl leading-tight text-primary md:text-4xl">
                  {c.t("mission_heading")}
                </h2>
                <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                  {c.t("mission_body")}
                </p>
                <Link
                  to="/about"
                  className="link-underline mt-7 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-primary transition-colors hover:text-accent"
                >
                  {c.t("mission_link_label")}
                </Link>
              </div>
              {c.img("mission_image") && (
                <img
                  src={c.img("mission_image")}
                  alt={c.t("mission_image_alt")}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover shadow-editorial"
                />
              )}
            </Reveal>
          </div>
        </section>
      )}

      {/* Stats — confirmed figures */}
      {c.visible("stats") && (
        <section data-section="home:stats" className="border-y border-border bg-secondary/60">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20 lg:px-8">
            <Reveal>
              <StatGrid stats={statsFrom(g, "home_stats")} />
            </Reveal>

            <Reveal className="mt-16 border-t border-border pt-12">
              <p className="eyebrow text-accent">{c.t("stats_annual_eyebrow")}</p>
              <div className="mt-8">
                <StatGrid stats={statsFrom(g, "annual_stats").slice(0, 3)} />
              </div>
              <p className="mt-8 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                {c.t("stats_footnote")}
              </p>
            </Reveal>
          </div>
        </section>
      )}

      {/* What we do — kept clearly separate from the block above */}
      {c.visible("services") && (
        <section
          data-section="home:services"
          className="mx-auto max-w-6xl px-5 pt-24 pb-20 md:pt-32 md:pb-28 lg:px-8"
        >
          <Reveal>
            <p className="eyebrow text-accent">{c.t("services_eyebrow")}</p>
            <h2 className="mt-4 max-w-2xl font-display text-3xl text-primary md:text-4xl">
              {c.t("services_heading")}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service, i) => (
              <Reveal
                key={`${service.title}-${i}`}
                as="article"
                delay={i * 70}
                className="card-lift overflow-hidden border border-border bg-card shadow-card"
              >
                {service.photos.length > 0 && <PhotoAlbum images={service.photos} />}
                <div className="p-7">
                  <h3 className="font-display text-2xl text-primary">{service.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {service.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Video */}
      {c.visible("video") && youtubeId(c.t("video_youtube")) && (
        <section
          data-section="home:video"
          className="mx-auto max-w-6xl px-5 pb-20 md:pb-28 lg:px-8"
        >
          <ScrollYouTube
            key={youtubeId(c.t("video_youtube"))}
            videoId={youtubeId(c.t("video_youtube"))}
            title={c.t("video_title")}
            className="shadow-editorial"
          />
        </section>
      )}

      {/* Facilities preview */}
      {c.visible("where") && (
        <section
          data-section="home:where"
          className="mx-auto max-w-6xl px-5 py-20 md:py-28 lg:px-8"
        >
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-accent">{c.t("where_eyebrow")}</p>
              <h2 className="mt-4 font-display text-3xl text-primary md:text-4xl">
                {c.t("where_heading")}
              </h2>
            </div>
            <Link
              to="/projects"
              className="link-underline text-xs font-semibold uppercase tracking-wide text-primary transition-colors hover:text-accent"
            >
              {c.t("where_link_label")}
            </Link>
          </Reveal>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.slice(0, whereCount).map((facility, i) => (
              <Reveal key={facility.slug} delay={i * 70}>
                <FacilityCard facility={facility} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Closing sequence — three ways to help, then a quiet newsletter note */}
      {(c.visible("help") || c.visible("newsletter")) && (
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-24 lg:px-8">
            {c.visible("help") && (
              <div data-section="home:help">
                <Reveal className="max-w-3xl">
                  <p className="eyebrow text-accent">{c.t("help_eyebrow")}</p>
                  <h2 className="mt-5 font-display text-3xl leading-tight text-primary md:text-4xl">
                    {c.t("help_heading")}
                  </h2>
                  <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
                    {c.t("help_body")}
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button asChild variant="donate" size="lg">
                      <a href={settings.donateUrl} target="_blank" rel="noreferrer">
                        {c.t("help_donate_label")}
                      </a>
                    </Button>
                    <Button asChild size="lg" variant="editorial">
                      <Link to="/get-involved">{c.t("help_volunteer_label")}</Link>
                    </Button>
                  </div>
                </Reveal>
              </div>
            )}

            {c.visible("newsletter") && (
              <div data-section="home:newsletter">
                <Reveal
                  className={
                    c.visible("help")
                      ? "mt-16 grid gap-8 border-t border-border pt-12 md:grid-cols-[1fr_1fr] md:items-center"
                      : "grid gap-8 md:grid-cols-[1fr_1fr] md:items-center"
                  }
                >
                  <div>
                    <p className="eyebrow text-accent">{c.t("news_eyebrow")}</p>
                    <h3 className="mt-4 font-display text-2xl text-primary md:text-3xl">
                      {c.t("news_heading")}
                    </h3>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                      {c.t("news_body")}
                    </p>
                  </div>
                  <NewsletterForm tone="light" />
                </Reveal>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      {c.visible("cta") && <DonateCta />}
    </>
  );
}
