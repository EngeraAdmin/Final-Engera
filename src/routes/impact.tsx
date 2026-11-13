import { createFileRoute } from "@tanstack/react-router";

import { StatGrid, statsFrom } from "@/components/site/StatCounter";
import { TestimonialCard } from "@/components/site/TestimonialCard";
import { Reveal } from "@/components/site/Reveal";
import { ScrollVideo } from "@/components/site/ScrollVideo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGlobalContent, useTestimonials } from "@/components/site/SiteDataContext";
import { getPublicPageContentServerFn } from "@/lib/page-content";
import { usePageContent } from "@/lib/preview";
import { pageHead } from "@/lib/seo";
import { paragraphs, str, strList } from "@/lib/content-schema";
import { mediaUrl } from "@/lib/media-library";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/impact")({
  loader: async () => getPublicPageContentServerFn({ data: { page: "impact" } }),
  head: ({ loaderData }) =>
    pageHead("impact", loaderData, "https://engra-heart-map.lovable.app/impact"),
  component: Impact,
});

function Impact() {
  const c = usePageContent("impact", Route.useLoaderData());
  const g = useGlobalContent();
  const testimonials = useTestimonials();
  const voices = testimonials.filter((t) => t.showOnImpact !== false);
  const pillars = c.list("pillars").map((p, i) => ({
    id: `tab-${i}`,
    label: str(p["label"]),
    heading: str(p["heading"]),
    photo: mediaUrl(str(p["photo"])),
    alt: str(p["alt"]),
    body: paragraphs(str(p["body"])),
    points: strList(p["points"]),
  }));
  const reportFile = mediaUrl(c.t("report_file")) || "#";

  return (
    <>
      <section
        data-section="impact:hero"
        className="relative isolate overflow-hidden bg-primary-dark text-primary-foreground"
      >
        {c.img("hero_image") && (
          <img
            src={c.img("hero_image")}
            alt={c.t("hero_image_alt")}
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(0deg, color-mix(in oklab, var(--primary-dark) 92%, transparent) 10%, color-mix(in oklab, var(--primary-dark) 45%, transparent) 100%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center md:py-28 lg:px-8">
          <Reveal>
            <p className="eyebrow text-accent-light">{c.t("hero_eyebrow")}</p>
            <h1 className="display-xl mt-5 text-4xl md:text-5xl">{c.t("hero_heading")}</h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-primary-foreground/85 md:text-lg">
              {c.t("hero_subtext")}
            </p>
          </Reveal>
        </div>
      </section>

      {c.visible("pillars") && pillars.length > 0 && (
        <section
          data-section="impact:pillars"
          className="mx-auto max-w-6xl px-5 py-16 md:py-20 lg:px-8"
        >
          <Tabs defaultValue="tab-0">
            <TabsList className="h-auto flex-wrap gap-1 bg-secondary p-1">
              {pillars.map((pillar) => (
                <TabsTrigger
                  key={pillar.id}
                  value={pillar.id}
                  className="cursor-pointer px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {pillar.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {pillars.map((pillar) => (
              <TabsContent key={pillar.id} value={pillar.id} className="mt-10">
                <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
                  <div>
                    <h2 className="font-display text-3xl leading-tight text-primary md:text-4xl">
                      {pillar.heading}
                    </h2>
                    {pillar.body.map((p, i) => (
                      <p key={i} className="mt-5 text-base leading-relaxed text-muted-foreground">
                        {p}
                      </p>
                    ))}
                    <ul className="mt-8 space-y-3">
                      {pillar.points.map((point, i) => (
                        <li key={i} className="flex gap-3 text-sm text-primary">
                          <span aria-hidden className="mt-1.5 size-2 shrink-0 bg-accent" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {pillar.photo && (
                    <img
                      src={pillar.photo}
                      alt={pillar.alt}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover shadow-editorial"
                    />
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </section>
      )}

      {c.visible("numbers") && (
        <section
          data-section="impact:numbers"
          className="border-y border-border bg-primary text-primary-foreground"
        >
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20 lg:px-8">
            <Reveal>
              <p className="eyebrow text-accent-light">{c.t("numbers_eyebrow")}</p>
              <h2 className="mt-4 font-display text-3xl md:text-4xl">{c.t("numbers_heading")}</h2>
              <div className="mt-12 [&_.rule-accent]:border-accent-light [&_p]:text-primary-foreground">
                <StatGrid stats={statsFrom(g, "annual_stats")} />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {c.visible("voices") && (
        <section data-section="impact:voices" className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
          <Reveal className="max-w-2xl">
            <p className="eyebrow text-accent">{c.t("voices_eyebrow")}</p>
            <h2 className="mt-4 font-display text-3xl text-primary md:text-4xl">
              {c.t("voices_heading")}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {voices.map((testimonial, i) => (
              <Reveal key={testimonial.id} delay={i * 60}>
                <TestimonialCard testimonial={testimonial} />
              </Reveal>
            ))}
          </div>
          {c.img("voices_video") && (
            <ScrollVideo
              key={c.img("voices_video")}
              src={c.img("voices_video")}
              poster={c.img("voices_video_poster")}
              aspectClassName="aspect-[697/360]"
              className="mt-12 shadow-editorial"
            />
          )}
        </section>
      )}

      {c.visible("report") && (
        <section data-section="impact:report" className="relative overflow-hidden bg-primary">
          {c.img("report_bg") && (
            <img
              src={c.img("report_bg")}
              alt=""
              aria-hidden
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-20"
            />
          )}
          <div className="relative mx-auto max-w-6xl px-5 py-20 lg:px-8">
            <Reveal className="max-w-2xl">
              <p className="eyebrow text-accent">{c.t("report_eyebrow")}</p>
              <h2 className="mt-4 font-display text-3xl text-primary-foreground md:text-4xl">
                {c.t("report_heading")}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-primary-foreground/80">
                {c.t("report_body")}
              </p>
              <Button asChild variant="donate" size="lg" className="mt-8 rounded-full px-8 text-sm">
                <a
                  href={reportFile}
                  download
                  {...(reportFile !== "#" ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {c.t("report_button")}
                </a>
              </Button>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
