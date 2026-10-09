import Link from "next/link";
import { AdminCard, AdminTitle } from "@/components/admin/admin-bits";
import { MakeCurrentButton, StartEditionForm } from "@/components/admin/edition-forms";
import { Badge } from "@/components/ui/badge";
import { formatIst } from "@/lib/datetime";
import { getEventSettings, listEditionSummaries } from "@/lib/queries";

export const metadata = { title: "Years" };

export default async function YearsPage() {
    const [current, editions] = await Promise.all([getEventSettings(), listEditionSummaries()]);
    const nextYear = Math.max(current.year, ...editions.map((e) => e.year)) + 1;

    return (
        <>
            <AdminTitle
                title="Years"
                description={`The public site shows ${current.year}. Earlier years stay viewable in the archive.`}
            />
            <div className="grid max-w-3xl gap-8">
                <AdminCard title="All years">
                    <ul className="divide-y">
                        {editions.map((edition) => (
                            <li
                                key={edition.year}
                                className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
                            >
                                <span className="font-heading text-2xl font-semibold tabular-nums">
                                    {edition.year}
                                </span>
                                {edition.is_current && <Badge>Current</Badge>}
                                <span className="text-sm text-muted-foreground">
                                    {formatIst(edition.shashthi)} – {formatIst(edition.dashami)}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {edition.programmes} programmes · {edition.participants}{" "}
                                    participants
                                </span>
                                <span className="ml-auto flex items-center gap-3">
                                    <Link
                                        href={`/archive/${edition.year}`}
                                        target="_blank"
                                        className="text-sm underline"
                                    >
                                        View
                                    </Link>
                                    {!edition.is_current && (
                                        <MakeCurrentButton year={edition.year} />
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </AdminCard>
                <AdminCard title={`Start ${nextYear}`}>
                    <StartEditionForm
                        currentYear={current.year}
                        defaults={{
                            year: nextYear,
                            name_en: current.name_en,
                            name_bn: current.name_bn,
                            venue: current.venue,
                        }}
                    />
                </AdminCard>
            </div>
        </>
    );
}
