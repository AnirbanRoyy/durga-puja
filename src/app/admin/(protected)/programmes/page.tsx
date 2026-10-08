import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { AdminTitle } from "@/components/admin/admin-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIst } from "@/lib/datetime";
import { countRegistrationsByProgramme, listProgrammes } from "@/lib/queries";

export const metadata = { title: "Programmes" };

export default async function AdminProgrammesPage() {
    const [programmes, counts] = await Promise.all([
        listProgrammes(),
        countRegistrationsByProgramme(),
    ]);
    return (
        <>
            <AdminTitle
                title="Programmes"
                description="Create, schedule and run every event."
                actions={
                    <Button asChild>
                        <Link href="/admin/programmes/new">
                            <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
                            New programme
                        </Link>
                    </Button>
                }
            />
            <div className="overflow-hidden rounded-2xl border bg-card">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                        <tr>
                            <th className="px-4 py-3">Programme</th>
                            <th className="hidden px-4 py-3 md:table-cell">When</th>
                            <th className="hidden px-4 py-3 sm:table-cell">Signed up</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {programmes.map((p) => (
                            <tr key={p.id} className="hover:bg-muted/30">
                                <td className="px-4 py-3">
                                    <Link
                                        href={`/admin/programmes/${p.id}`}
                                        className="font-medium hover:text-primary"
                                    >
                                        {p.title_en}
                                    </Link>
                                    <p className="text-xs text-muted-foreground">
                                        {p.type.replace("_", " ")}
                                    </p>
                                </td>
                                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                                    {formatIst(p.starts_at)}
                                </td>
                                <td className="hidden px-4 py-3 tabular-nums sm:table-cell">
                                    {counts.get(p.id) ?? 0}
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant="secondary">{p.status}</Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
