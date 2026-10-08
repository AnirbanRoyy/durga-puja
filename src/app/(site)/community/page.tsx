import Image from "next/image";
import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Calendar03Icon,
    Megaphone01Icon,
    Notification03Icon,
    QrCodeIcon,
    WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { Alpana } from "@/components/decor/alpana";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getWhatsappSettings } from "@/lib/queries";

export async function generateMetadata() {
    const t = await getTranslations("community");
    return { title: t("title") };
}

/** Uses the uploaded QR if there is one, otherwise draws one from the invite link. */
async function resolveQr(invite: string | null, uploaded: string | null) {
    if (uploaded) return { src: uploaded, generated: false };
    if (!invite) return null;
    const src = await QRCode.toDataURL(invite, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 640,
        color: { dark: "#075E54", light: "#ffffff" },
    });
    return { src, generated: true };
}

export default async function CommunityPage() {
    const [t, whatsapp] = await Promise.all([getTranslations("community"), getWhatsappSettings()]);
    const qr = await resolveQr(whatsapp.invite_url, whatsapp.qr_image_url);
    const perks = [
        { icon: Calendar03Icon, text: t("get1") },
        { icon: Megaphone01Icon, text: t("get2") },
        { icon: Notification03Icon, text: t("get3") },
    ];

    return (
        <>
            <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
            <div className="mx-auto max-w-4xl px-4 pt-12">
                <div className="grid items-center gap-10 md:grid-cols-[minmax(0,340px)_1fr]">
                    <div className="relative mx-auto w-full max-w-[340px]">
                        <Alpana className="absolute -inset-10 text-[#25D366]/25" />
                        <div className="relative rounded-3xl border-4 border-[#25D366]/70 bg-white p-5 shadow-2xl shadow-[#075E54]/20">
                            {qr ? (
                                <>
                                    <Image
                                        src={qr.src}
                                        alt={t("qrAlt")}
                                        width={640}
                                        height={640}
                                        unoptimized={qr.generated}
                                        className="aspect-square w-full object-contain"
                                        priority
                                    />
                                    <p className="mt-3 text-center text-sm font-semibold text-neutral-800">
                                        {t("scanHint")}
                                    </p>
                                </>
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
                        </div>
                    </div>

                    <div>
                        <h2 className="text-3xl font-semibold">{t("howTitle")}</h2>
                        <ol className="mt-4 space-y-3">
                            {(["step1", "step2", "step3"] as const).map((step, i) => (
                                <li key={step} className="flex gap-3">
                                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#25D366] text-sm font-semibold text-white">
                                        {i + 1}
                                    </span>
                                    <span className="pt-0.5 text-muted-foreground">{t(step)}</span>
                                </li>
                            ))}
                        </ol>

                        {whatsapp.invite_url ? (
                            <Button
                                asChild
                                size="lg"
                                className="mt-6 h-12 rounded-full bg-[#25D366] px-7 text-base font-semibold text-white hover:bg-[#1ebe5a]"
                            >
                                <a
                                    href={whatsapp.invite_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <HugeiconsIcon
                                        icon={WhatsappIcon}
                                        data-icon="inline-start"
                                        className="size-5"
                                    />
                                    {t("join")}
                                </a>
                            </Button>
                        ) : (
                            <p className="mt-6 rounded-2xl bg-secondary/60 p-4 text-sm">
                                {t("comingSoonBody")}
                            </p>
                        )}

                        <h3 className="mt-10 text-lg font-semibold">{t("getTitle")}</h3>
                        <ul className="mt-3 space-y-2.5">
                            {perks.map((perk) => (
                                <li
                                    key={perk.text}
                                    className="flex items-start gap-3 text-sm text-muted-foreground"
                                >
                                    <HugeiconsIcon
                                        icon={perk.icon}
                                        className="mt-0.5 size-4.5 shrink-0 text-[#25D366]"
                                    />
                                    {perk.text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
}
