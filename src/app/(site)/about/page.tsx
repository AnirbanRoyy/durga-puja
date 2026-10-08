import { getLocale, getTranslations } from "next-intl/server";
import { Alpana } from "@/components/decor/alpana";
import { PageHeader } from "@/components/layout/page-header";
import { aboutContent } from "@/content/about";

export async function generateMetadata() {
    const t = await getTranslations("about");
    return { title: t("title") };
}

export default async function AboutPage() {
    const [t, locale] = await Promise.all([getTranslations("about"), getLocale()]);
    const sections = aboutContent(locale);

    return (
        <>
            <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
            <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-12 lg:grid-cols-[220px_1fr]">
                <nav aria-label={t("contents")} className="hidden lg:block">
                    <div className="sticky top-24">
                        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                            {t("contents")}
                        </p>
                        <ol className="mt-3 space-y-1 border-l">
                            {sections.map((s) => (
                                <li key={s.id}>
                                    <a
                                        href={`#${s.id}`}
                                        className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
                                    >
                                        {s.title}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </div>
                </nav>

                <article className="max-w-3xl space-y-16">
                    {sections.map((s) => (
                        <section key={s.id} id={s.id} className="scroll-mt-24">
                            <h2 className="text-3xl font-semibold sm:text-4xl">{s.title}</h2>
                            <div className="mt-4 space-y-4 text-lg leading-relaxed text-foreground/85">
                                {s.paragraphs.map((p, i) => (
                                    <p key={i}>{p}</p>
                                ))}
                            </div>
                            {s.quote && (
                                <blockquote className="relative mt-6 overflow-hidden rounded-2xl bg-maroon p-6 text-center font-heading text-xl leading-relaxed text-kash">
                                    <Alpana className="absolute -top-10 -left-10 size-40 text-gold/20" />
                                    <span className="relative">{s.quote}</span>
                                </blockquote>
                            )}
                            {s.items && (
                                <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                                    {s.items.map((item) => (
                                        <div
                                            key={item.term}
                                            className="rounded-2xl border bg-card p-5"
                                        >
                                            <dt className="font-heading text-lg font-semibold text-primary">
                                                {item.term}
                                            </dt>
                                            <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                                                {item.text}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                        </section>
                    ))}
                </article>
            </div>
        </>
    );
}
