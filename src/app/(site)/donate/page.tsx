import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { QrCodeIcon } from "@hugeicons/core-free-icons";
import { Alpana } from "@/components/decor/alpana";
import { CopyUpi } from "@/components/donate/copy-upi";
import { PageHeader } from "@/components/layout/page-header";
import { pick } from "@/lib/localize";
import { getDonationSettings } from "@/lib/queries";

export async function generateMetadata() {
    const t = await getTranslations("donate");
    return { title: t("title") };
}

export default async function DonatePage() {
    const [t, locale, donation] = await Promise.all([
        getTranslations("donate"),
        getLocale(),
        getDonationSettings(),
    ]);
    const note = pick(locale, donation.note_en, donation.note_bn);
    const upiLink = donation.upi_id
        ? `upi://pay?${new URLSearchParams({
              pa: donation.upi_id,
              ...(donation.payee_name ? { pn: donation.payee_name } : {}),
              cu: "INR",
          })}`
        : null;

    return (
        <>
            <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
            <div className="mx-auto max-w-4xl px-4 pt-12">
                <div className="grid items-center gap-10 md:grid-cols-[minmax(0,340px)_1fr]">
                    <div className="relative mx-auto w-full max-w-[340px]">
                        <Alpana className="absolute -inset-10 text-marigold/30" />
                        <div className="relative rounded-3xl border-4 border-gold/60 bg-white p-5 shadow-2xl shadow-maroon/20">
                            {donation.qr_image_url ? (
                                <Image
                                    src={donation.qr_image_url}
                                    alt={t("qrAlt")}
                                    width={600}
                                    height={600}
                                    className="aspect-square w-full object-contain"
                                    priority
                                />
                            ) : (
                                <div className="grid aspect-square w-full place-items-center rounded-xl border-2 border-dashed border-neutral-300 text-center text-neutral-500">
                                    <div>
                                        <HugeiconsIcon
                                            icon={QrCodeIcon}
                                            className="mx-auto size-14"
                                        />
                                        <p className="mt-2 text-sm">{t("qrComingSoon")}</p>
                                    </div>
                                </div>
                            )}
                            {donation.payee_name && (
                                <p className="mt-3 text-center text-sm font-semibold text-neutral-800">
                                    {donation.payee_name}
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-3xl font-semibold">{t("howTitle")}</h2>
                        <ol className="mt-4 space-y-3">
                            {(["step1", "step2", "step3"] as const).map((step, i) => (
                                <li key={step} className="flex gap-3">
                                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                                        {i + 1}
                                    </span>
                                    <span className="pt-0.5 text-muted-foreground">{t(step)}</span>
                                </li>
                            ))}
                        </ol>
                        {donation.upi_id && <CopyUpi upiId={donation.upi_id} upiLink={upiLink!} />}
                        {note && (
                            <p className="mt-6 rounded-2xl bg-secondary/60 p-4 text-sm">{note}</p>
                        )}
                        <p className="mt-6 text-xs text-muted-foreground">{t("disclaimer")}</p>
                    </div>
                </div>
            </div>
        </>
    );
}
