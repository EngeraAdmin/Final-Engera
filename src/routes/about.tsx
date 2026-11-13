import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/site/Reveal";
import { ScrollVideo } from "@/components/site/ScrollVideo";
import { useSettings } from "@/components/site/SiteDataContext";
import { getPublicPageContentServerFn } from "@/lib/page-content";
import { usePageContent } from "@/lib/preview";
import { pageHead } from "@/lib/seo";
import { str } from "@/lib/content-schema";
import { mediaUrl } from "@/lib/media-library";

export const Route = createFileRoute("/about")({
  loader: async () => getPublicPageContentServerFn({ data: { page: "about" } }),
  head: ({ loaderData }) =>
    pageHead("about", loaderData, "https://engra-heart-map.lovable.app/about"),
  component: About,
});

interface Member {
  name: string;
  role: string;
  bio: string;
  photo?: string;
}

function About() {
  const c = usePageContent("about", Route.useLoaderData());
  const { donateUrl } = useSettings();
  const timeline = c.list("timeline").map((t) => ({
    year: str(t["year"]),
    title: str(t["title"]),
    body: str(t["body"]),
  }));
  const members = c.list("team_members");
  const teamGroups = c
    .list("team_groups")
    .map((g) => ({
      id: str(g["id"]),
      label: str(g["label"]),
      heading: str(g["heading"]),
      members: members
        .filter((m) => str(m["group"]) === str(g["id"]))
        .map((m): Member => {
          const member: Member = {
            name: str(m["name"]),
            role: str(m["role"]),
            bio: str(m["bio"]),
          };
          const photo = mediaUrl(str(m["photo"]));
          if (photo) member.photo = photo;
          return member;
        }),
    }))
    .filter((g) => g.members.length > 0);
  const videoSrc = c.img("hero_video");
  return (
    <>
      {/* Opening — editorial split, distinct from the home banner */}
      <section data-section="about:hero" className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:px-8">
          <Reveal>
            <p className="eyebrow text-accent">{c.t("hero_eyebrow")}</p>
            <h1 className="display-xl mt-5 text-4xl text-primary md:text-5xl">
              {c.t("hero_heading")}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {c.t("hero_subtext")}
            </p>
          </Reveal>
          {videoSrc && (
            <Reveal delay={80}>
              <ScrollVideo
                key={videoSrc}
                src={videoSrc}
                poster={c.img("hero_video_poster")}
                aspectClassName="aspect-[107/180]"
                maxHeightClassName="h-[55vh] md:h-[65vh]"
                className="shadow-editorial"
              />
            </Reveal>
          )}
        </div>
      </section>

      {(c.visible("vision") || c.visible("believe")) && (
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
          {c.visible("vision") && (
            <div data-section="about:vision">
              <Reveal className="grid gap-10 md:grid-cols-2">
                <div className="card-lift border border-border bg-card p-8 shadow-card">
                  <p className="eyebrow text-accent">{c.t("vision_eyebrow")}</p>
                  <p className="mt-4 font-display text-2xl leading-snug text-primary">
                    {c.t("vision_text")}
                  </p>
                </div>
                <div className="card-lift border border-border bg-primary p-8 text-primary-foreground shadow-card">
                  <p className="eyebrow text-accent-light">{c.t("mission_eyebrow")}</p>
                  <p className="mt-4 font-display text-2xl leading-snug">{c.t("mission_text")}</p>
                </div>
              </Reveal>
            </div>
          )}

          {c.visible("believe") && (
            <div data-section="about:believe" className={c.visible("vision") ? "mt-16" : ""}>
              <Reveal className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
                {c.img("believe_image") && (
                  <img
                    src={c.img("believe_image")}
                    alt={c.t("believe_image_alt")}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover shadow-editorial"
                  />
                )}
                <div>
                  <p className="eyebrow text-accent">{c.t("believe_eyebrow")}</p>
                  <h2 className="mt-4 font-display text-3xl text-primary md:text-4xl">
                    {c.t("believe_heading")}
                  </h2>
                  {c.paras("believe_body").map((p, i) => (
                    <p
                      key={i}
                      className={`${i === 0 ? "mt-5" : "mt-4"} text-base leading-relaxed text-muted-foreground`}
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </Reveal>
            </div>
          )}
        </section>
      )}

      {c.visible("history") && (
        <section data-section="about:history" className="border-y border-border bg-secondary/50">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
            <Reveal>
              <p className="eyebrow text-accent">{c.t("history_eyebrow")}</p>
              <h2 className="mt-4 font-display text-3xl text-primary md:text-4xl">
                {c.t("history_heading")}
              </h2>
            </Reveal>

            <ol className="mt-12 space-y-10 border-l border-border pl-6 md:pl-10">
              {timeline.map((item, i) => (
                <Reveal as="li" key={`${item.year}-${i}`} delay={i * 60} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-[1.85rem] top-2 size-3 rounded-full bg-accent md:-left-[2.85rem]"
                  />
                  <p className="eyebrow text-accent">{item.year}</p>
                  <h3 className="mt-2 font-display text-2xl text-primary">{item.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </Reveal>
              ))}
            </ol>

            <Reveal className="mt-16 max-w-3xl border-t border-border pt-10">
              <p className="eyebrow text-accent">{c.t("today_eyebrow")}</p>
              <h2 className="mt-4 font-display text-3xl text-primary md:text-4xl">
                {c.t("today_heading")}
              </h2>
              {c.paras("today_body").map((p, i) => (
                <p
                  key={i}
                  className={`${i === 0 ? "mt-5" : "mt-4"} text-base leading-relaxed text-muted-foreground`}
                >
                  {p}
                </p>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {/* Team */}
      {c.visible("team") && (
        <section
          data-section="about:team"
          className="relative isolate overflow-hidden bg-primary-dark text-primary-foreground"
        >
          {c.img("team_bg_image") && (
            <img
              src={c.img("team_bg_image")}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover opacity-20"
            />
          )}
          <div className="relative mx-auto max-w-6xl px-5 py-20 lg:px-8">
            <Reveal>
              <p className="eyebrow text-accent-light">{c.t("team_eyebrow")}</p>
              <h2 className="mt-4 font-display text-3xl md:text-4xl">{c.t("team_heading")}</h2>
              <p className="mt-4 max-w-2xl text-primary-foreground/80">{c.t("team_intro")}</p>
            </Reveal>

            <div className="mt-16 space-y-16">
              {teamGroups.map((group) => (
                <div key={group.id}>
                  <Reveal>
                    <p className="eyebrow text-accent-light">{group.label}</p>
                    <h3 className="mt-3 font-display text-2xl md:text-3xl">{group.heading}</h3>
                  </Reveal>
                  <div
                    className={
                      group.members.length === 1
                        ? "mt-8 grid gap-8 md:grid-cols-[220px_1fr] md:items-start"
                        : "mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
                    }
                  >
                    {group.members.map((member, i) => (
                      <Reveal
                        key={`${member.name}-${i}`}
                        as="article"
                        delay={i * 60}
                        className={
                          group.members.length === 1
                            ? "contents"
                            : "card-lift border border-primary-foreground/15 bg-primary-foreground/5 p-6"
                        }
                      >
                        {group.members.length === 1 ? (
                          <>
                            <div>
                              {member.photo ? (
                                <img
                                  src={member.photo}
                                  alt={member.name}
                                  loading="lazy"
                                  className="aspect-square w-full max-w-[220px] rounded-full object-cover ring-1 ring-primary-foreground/20"
                                />
                              ) : (
                                <div className="flex aspect-square w-full max-w-[220px] items-center justify-center border border-primary-foreground/20 bg-primary-foreground/5 font-display text-4xl text-accent-light">
                                  {member.name
                                    .split(" ")
                                    .map((part) => part[0])
                                    .slice(0, 2)
                                    .join("")}
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="font-display text-2xl">{member.name}</h4>
                              <p className="eyebrow mt-2 text-accent-light">{member.role}</p>
                              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-primary-foreground/80">
                                {member.bio}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            {member.photo ? (
                              <img
                                src={member.photo}
                                alt={member.name}
                                loading="lazy"
                                className="aspect-square w-full object-cover"
                              />
                            ) : (
                              <div className="flex aspect-square w-full items-center justify-center border border-primary-foreground/20 bg-primary-foreground/5 font-display text-4xl text-accent-light">
                                {member.name
                                  .split(" ")
                                  .map((part) => part[0])
                                  .slice(0, 2)
                                  .join("")}
                              </div>
                            )}
                            <h4 className="mt-5 font-display text-xl">{member.name}</h4>
                            <p className="eyebrow mt-2 text-accent-light">{member.role}</p>
                            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80">
                              {member.bio}
                            </p>
                          </>
                        )}
                      </Reveal>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Reveal className="mt-16 flex flex-wrap gap-3">
              <Button asChild variant="donate">
                <a href={donateUrl} target="_blank" rel="noreferrer">
                  {c.t("team_support_label")}
                </a>
              </Button>
              <Button
                asChild
                variant="editorial"
                className="border-primary-foreground/40 text-primary-foreground hover:border-accent-light hover:text-accent-light"
              >
                <Link to="/get-involved">{c.t("team_involved_label")}</Link>
              </Button>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
