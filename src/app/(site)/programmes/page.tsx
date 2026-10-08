import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ProgrammeCard } from "@/components/programmes/programme-card";
import { countRegistrationsByProgramme, listProgrammes } from "@/lib/queries";

export async function generateMetadata() {
    const t = await getTranslations("programmes");
    return { title: t("title") };
}

export default async function ProgrammesPage() {
    const [t, programmes, counts] = await Promise.all([
        getTranslations("programmes"),
        listProgrammes(),
        countRegistrationsByProgramme(),
    ]);

    return (
        <>
            <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
            <div className="mx-auto max-w-6xl px-4 pt-12">
                {programmes.length === 0 ? (
                    <p className="text-muted-foreground">{t("empty")}</p>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {programmes.map((p) => (
                            <ProgrammeCard
                                key={p.id}
                                programme={p}
                                registrations={counts.get(p.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
