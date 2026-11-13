import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { ScrollVideo } from "@/components/site/ScrollVideo";
import { useLinkVars, useSettings } from "@/components/site/SiteDataContext";
import { getPublicPageContentServerFn } from "@/lib/page-content";
import { usePageContent } from "@/lib/preview";
import { pageHead } from "@/lib/seo";
import { isExternal, resolveHref, str, strList } from "@/lib/content-schema";

export const Route = createFileRoute("/get-involved")({
  loader: async () => getPublicPageContentServerFn({ data: { page: "get-involved" } }),
  head: ({ loaderData }) => pageHead("get-involved", loaderData),
  component: GetInvolved,
});

type Tone = "donate" | "join" | "partner";

function GetInvolved() {
  const c = usePageContent("get-involved", Route.useLoaderData());
  const settings = useSettings();
  const vars = useLinkVars();
  const ways = c.list("ways").map((w) => {
    const style = str(w["style"]);
    const tone: Tone = style === "join" || style === "partner" ? style : "donate";
    return {
      tone,
      kicker: str(w["kicker"]),
      title: str(w["title"]),
      body: str(w["body"]),
      points: strList(w["points"]),
      cta: { label: str(w["button_label"]), href: resolveHref(str(w["button_link"]), vars) },
    };
  });
  const videoSrc = c.img("not_sure_video");

  return (
    <>
      <section data-section="get-involved:hero" className="bg-background">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20 lg:px-8">
          <div className="grid gap-10 border-b border-border pb-12 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow text-accent">{c.t("hero_eyebrow")}</p>
              <h1 className="display-xl mt-5 text-4xl text-primary md:text-5xl">
                {c.t("hero_heading")}
              </h1>
            </div>
            <p className="rule-accent text-base leading-relaxed text-muted-foreground md:text-lg">
              {c.t("hero_body")}
            </p>
          </div>
        </div>
      </section>

      {c.visible("ways") && ways.length > 0 && (
        <section
          data-section="get-involved:ways"
          className="mx-auto max-w-6xl px-5 pb-16 pt-2 md:pb-20 lg:px-8"
        >
          <div className="grid gap-6 lg:grid-cols-3">
            {ways.map((way, index) => (
              <article
                key={`${way.title}-${index}`}
                className={
                  way.tone === "donate"
                    ? "card-lift flex flex-col border border-border bg-card p-8 shadow-card"
                    : way.tone === "join"
                      ? "card-warm flex flex-col rounded-2xl border border-accent/25 bg-accent/[0.06] p-8"
                      : "card-lift flex flex-col rounded-2xl border border-primary/20 bg-primary p-8 text-primary-foreground shadow-editorial"
                }
              >
                <p
                  className={
                    way.tone === "donate"
                      ? "eyebrow text-accent"
                      : way.tone === "join"
                        ? "eyebrow text-accent-dark"
                        : "eyebrow text-accent-light"
                  }
                >
                  {way.kicker}
                </p>
                <h2
                  className={
                    way.tone === "partner"
                      ? "mt-3 font-display text-3xl"
                      : "mt-3 font-display text-3xl text-primary"
                  }
                >
                  {way.title}
                </h2>
                <p
                  className={
                    way.tone === "partner"
                      ? "mt-4 text-sm leading-relaxed text-primary-foreground/80"
                      : "mt-4 text-sm leading-relaxed text-muted-foreground"
                  }
                >
                  {way.body}
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {way.points.map((point, i) => (
                    <li
                      key={i}
                      className={
                        way.tone === "partner"
                          ? "flex gap-3 text-sm text-primary-foreground/90"
                          : "flex gap-3 text-sm text-primary"
                      }
                    >
                      <span
                        aria-hidden
                        className={
                          way.tone === "donate"
                            ? "mt-1.5 size-2 shrink-0 bg-accent"
                            : way.tone === "join"
                              ? "mt-1.5 size-2 shrink-0 rounded-full bg-accent-dark"
                              : "mt-1.5 size-2 shrink-0 rounded-full bg-accent-light"
                        }
                      />
                      {point}
                    </li>
                  ))}
                </ul>
                {way.cta.label && (
                  <Button
                    asChild
                    variant={way.tone === "donate" ? "donate" : "editorial"}
                    className={
                      way.tone === "donate"
                        ? "mt-8"
                        : way.tone === "join"
                          ? "mt-8 rounded-full border-accent-dark text-accent-dark hover:bg-accent-dark hover:text-accent-foreground"
                          : "mt-8 rounded-full border-primary-foreground/50 text-primary-foreground hover:border-accent-light hover:text-accent-light"
                    }
                  >
                    <a
                      href={way.cta.href}
                      {...(isExternal(way.cta.href) ? { target: "_blank", rel: "noreferrer" } : {})}
                    >
                      {way.cta.label}
                    </a>
                  </Button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {c.visible("not-sure") && (
        <section
          data-section="get-involved:not-sure"
          className="border-y border-border bg-primary text-primary-foreground"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:items-center lg:px-8">
            {videoSrc && (
              <ScrollVideo
                key={videoSrc}
                src={videoSrc}
                poster={c.img("not_sure_poster")}
                aspectClassName="aspect-[37/60]"
                maxHeightClassName="h-[55vh] md:h-[65vh]"
              />
            )}
            <div>
              <h2 className="font-display text-3xl md:text-4xl">{c.t("not_sure_heading")}</h2>
              <p className="mt-4 text-primary-foreground/80">{c.t("not_sure_body")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="donate">
                  <a href={settings.donateUrl} target="_blank" rel="noreferrer">
                    {c.t("not_sure_donate_label")}
                  </a>
                </Button>
                <Button
                  asChild
                  variant="editorial"
                  className="border-primary-foreground/40 text-primary-foreground hover:border-accent-light hover:text-accent-light"
                >
                  <Link to="/contact">{c.t("not_sure_contact_label")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
