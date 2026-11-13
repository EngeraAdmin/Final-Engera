import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { IllustrativeMap } from "@/components/map/IllustrativeMap";
import { FacilityPlaceholder } from "@/components/site/FacilityPlaceholder";
import { TestimonialCard } from "@/components/site/TestimonialCard";
import { Reveal } from "@/components/site/Reveal";
import { getSiteDataServerFn } from "@/lib/site-data";
import { useSiteData } from "@/components/site/SiteDataContext";
import { getPublicPageContentServerFn } from "@/lib/page-content";
import { usePageContent } from "@/lib/preview";

export const Route = createFileRoute("/projects/$slug")({
  loader: async ({ params }) => {
    const [{ facilities }, content] = await Promise.all([
      getSiteDataServerFn(),
      getPublicPageContentServerFn({ data: { page: "facility" } }),
    ]);
    const facility = facilities.find((f) => f.slug === params.slug);
    if (!facility) throw notFound();
    return { facility, content };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Facility not found — Engera USA" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { facility } = loaderData;
    const title = `${facility.name} — Engera USA`;
    const url = `https://engra-heart-map.lovable.app/projects/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: facility.shortDescription },
        { property: "og:title", content: title },
        { property: "og:description", content: facility.shortDescription },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: FacilityDetail,
});

function FacilityDetail() {
  const { facility: loaded, content } = Route.useLoaderData();
  const c = usePageContent("facility", content);
  const { facilities, testimonials, settings } = useSiteData();
  // Prefer the shared copy (it updates with the editor's live preview), else the loader's.
  const facility = facilities.find((f) => f.slug === loaded.slug) ?? loaded;
  const vars = { name: facility.name };
  const quotes = testimonials.filter((t) => t.facilitySlug === facility.slug);
  const others = facilities.filter((f) => f.slug !== facility.slug).slice(0, 3);

  return (
    <>
      <div className="h-[60vh] min-h-[380px] w-full md:h-[75vh] md:min-h-[520px]">
        {facility.photo ? (
          <img
            src={facility.photo}
            alt={facility.photoAlt ?? facility.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <FacilityPlaceholder name={facility.name} region={facility.region} size="lg" />
        )}
      </div>

      <section className="mx-auto max-w-6xl px-5 py-14 lg:px-8">
        <Link
          to="/projects"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-accent"
        >
          {c.t("back_label")}
        </Link>

        <div className="mt-8 grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          <Reveal>
            <div data-section="facility:main">
              <p className="eyebrow text-accent">{facility.region}</p>
              <h1 className="display-xl mt-4 text-4xl text-primary md:text-5xl">{facility.name}</h1>
              <p className="mt-3 text-sm text-muted-foreground">{facility.locationNote}</p>

              <div className="mt-8 space-y-5 text-base leading-relaxed text-muted-foreground">
                {facility.description.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {facility.facts.length > 0 && (
                <dl className="mt-10 grid gap-6 border-t border-border pt-8 sm:grid-cols-3">
                  {facility.facts.map((fact, i) => (
                    <div key={i}>
                      <dt className="eyebrow text-accent">{fact.label}</dt>
                      <dd className="mt-2 text-sm leading-relaxed text-primary">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {facility.work.length > 0 && (
                <div className="mt-12">
                  <h2 className="font-display text-2xl text-primary md:text-3xl">
                    {c.t("work_heading", vars)}
                  </h2>
                  <ul className="mt-6 space-y-4">
                    {facility.work.map((item, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-relaxed text-primary">
                        <span aria-hidden className="mt-1.5 size-2 shrink-0 bg-accent" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                    {c.t("figures_note", vars)}
                  </p>
                </div>
              )}

              <Button asChild variant="donate" className="mt-10">
                <a href={settings.donateUrl} target="_blank" rel="noreferrer">
                  {c.t("support_label", vars)}
                </a>
              </Button>
            </div>
          </Reveal>

          <Reveal>
            <div data-section="facility:location">
              <p className="eyebrow text-primary">{c.t("location_label", vars)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.t("map_hint", vars)}</p>
              <div className="mt-4">
                <IllustrativeMap
                  facilities={facilities}
                  selectedSlug={facility.slug}
                  showLinks
                  showDisclaimer
                  className="h-[340px] md:h-[400px]"
                />
              </div>
              {!facility.photo ? (
                <p className="mt-6 border border-border bg-secondary/60 p-4 text-xs leading-relaxed text-muted-foreground">
                  {c.t("no_photo_note", vars)}
                </p>
              ) : null}
            </div>
          </Reveal>
        </div>
      </section>

      {quotes.length > 0 && c.visible("voices") ? (
        <section data-section="facility:voices" className="border-y border-border bg-secondary/50">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
            <Reveal>
              <p className="eyebrow text-accent">{c.t("voices_eyebrow", vars)}</p>
              <h2 className="mt-4 font-display text-3xl text-primary md:text-4xl">
                {c.t("voices_heading", vars)}
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {quotes.map((testimonial, i) => (
                <Reveal key={testimonial.id} delay={i * 60}>
                  <TestimonialCard testimonial={testimonial} showFacilityLink={false} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {c.visible("others") && others.length > 0 && (
        <section data-section="facility:others" className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <h2 className="font-display text-2xl text-primary md:text-3xl">
            {c.t("others_heading", vars)}
          </h2>
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {others.map((other) => (
              <li key={other.slug}>
                <Link
                  to="/projects/$slug"
                  params={{ slug: other.slug }}
                  className="flex flex-col gap-1 px-2 py-4 transition-colors hover:bg-secondary hover:text-accent"
                >
                  <span className="font-display text-xl text-primary">{other.name}</span>
                  <span className="text-sm text-muted-foreground">{other.shortDescription}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
