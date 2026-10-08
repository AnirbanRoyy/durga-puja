import { getTranslations } from "next-intl/server";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { PageHeader } from "@/components/layout/page-header";

export async function generateMetadata() {
    const t = await getTranslations("feedback");
    return { title: t("title") };
}

export default async function FeedbackPage() {
    const t = await getTranslations("feedback");
    return (
        <>
            <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
            <div className="mx-auto max-w-2xl px-4 pt-12">
                <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
                    <FeedbackForm />
                </div>
            </div>
        </>
    );
}
