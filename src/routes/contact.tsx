import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/components/site/SiteDataContext";
import { getPublicPageContentServerFn } from "@/lib/page-content";
import { usePageContent } from "@/lib/preview";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  loader: async () => getPublicPageContentServerFn({ data: { page: "contact" } }),
  head: ({ loaderData }) => pageHead("contact", loaderData),
  component: Contact,
});

function Contact() {
  const c = usePageContent("contact", Route.useLoaderData());
  const settings = useSettings();
  const topics = c.lines("form_topics");
  const firstTopic = topics[0] ?? "General enquiry";
  const [topic, setTopic] = useState(firstTopic);
  const [submitting, setSubmitting] = useState(false);
  const currentTopic = topics.includes(topic) ? topic : firstTopic;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    // No backend connected yet: hand off to email so nothing is silently lost.
    const data = new FormData(form);
    const body = `Topic: ${currentTopic}\n\n${String(data.get("message") ?? "")}\n\n— ${String(
      data.get("name") ?? "",
    )} (${String(data.get("email") ?? "")})`;
    window.location.href = `mailto:${settings.email}?subject=${encodeURIComponent(
      `Website enquiry: ${currentTopic}`,
    )}&body=${encodeURIComponent(body)}`;
    toast.success("Opening your email app to send the message.");
    form.reset();
    setTopic(firstTopic);
    setSubmitting(false);
  };

  return (
    <>
      <section data-section="contact:hero" className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-5 py-14 md:py-16 lg:px-8">
          <div className="max-w-3xl border-l-4 border-accent pl-6 md:pl-8">
            <p className="eyebrow text-accent">{c.t("hero_eyebrow")}</p>
            <h1 className="display-xl mt-4 text-4xl text-primary md:text-5xl">
              {c.t("hero_heading")}
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              {c.t("hero_body")}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <form
            data-section="contact:form"
            onSubmit={handleSubmit}
            className="border border-border bg-card p-7 shadow-card md:p-9"
          >
            <h2 className="font-display text-2xl text-primary">{c.t("form_heading")}</h2>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">{c.t("form_name_label")}</Label>
                <Input id="name" name="name" required autoComplete="name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{c.t("form_email_label")}</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <Label htmlFor="topic">{c.t("form_topic_label")}</Label>
              <Select value={currentTopic} onValueChange={setTopic}>
                <SelectTrigger id="topic">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-5 grid gap-2">
              <Label htmlFor="message">{c.t("form_message_label")}</Label>
              <Textarea id="message" name="message" rows={6} required />
            </div>

            <Button type="submit" variant="donate" className="mt-7" disabled={submitting}>
              {c.t("form_button")}
            </Button>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {c.t("form_note", { email: settings.email })}
            </p>
          </form>

          <div className="space-y-8">
            <div data-section="contact:details" className="space-y-8">
              <div className="rule-accent">
                <p className="eyebrow text-accent">{c.t("info_email_eyebrow")}</p>
                <p className="mt-2 font-display text-xl text-primary">{settings.email}</p>
                {settings.phone && <p className="mt-2 text-sm text-primary">{settings.phone}</p>}
                {settings.address && (
                  <p className="mt-1 text-sm text-muted-foreground">{settings.address}</p>
                )}
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {c.t("info_note")}
                </p>
              </div>

              <div className="rule-accent">
                <p className="eyebrow text-accent">{c.t("sister_eyebrow")}</p>
                <a
                  href={c.t("sister_url")}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-sm text-muted-foreground hover:text-accent"
                >
                  {c.t("sister_label")}
                </a>
              </div>
            </div>

            {c.visible("give") && (
              <div
                data-section="contact:give"
                className="border border-border bg-primary p-7 text-primary-foreground"
              >
                <h2 className="font-display text-2xl">{c.t("give_heading")}</h2>
                <p className="mt-3 text-sm text-primary-foreground/80">{c.t("give_body")}</p>
                <Button asChild variant="donate" className="mt-6">
                  <a href={settings.donateUrl} target="_blank" rel="noreferrer">
                    {c.t("give_button")}
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
