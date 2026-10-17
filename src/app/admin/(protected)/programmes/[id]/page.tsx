import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Award01Icon,
    Brain02Icon,
    Chair01Icon,
    PaintBoardIcon,
    UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { AdminPermissions } from "@/components/admin/admin-permissions";
import { permissionFlags } from "@/lib/access-rules";
import { checkPermission } from "@/lib/permissions";
import { AdminCard, AdminTitle } from "@/components/admin/admin-bits";
import { DeleteProgramme, QuickToggles } from "@/components/admin/programme-actions";
import { ProgrammeForm } from "@/components/admin/programme-form";
import { Button } from "@/components/ui/button";
import { getProgrammeById } from "@/lib/queries";

export const metadata = { title: "Edit programme" };

export default async function EditProgrammePage(props: PageProps<"/admin/programmes/[id]">) {
    const { id } = await props.params;
    const target = { programmeId: id };
    const session = await checkPermission("read", target);
    const can = permissionFlags(session, target);
    const programme = await getProgrammeById(id);
    if (!programme) {
        notFound();
    }

    const tools = [
        { href: "registrations", label: "Registrations", icon: UserGroupIcon, show: true },
        {
            href: "musical-chair",
            label: "Host console",
            icon: Chair01Icon,
            show: programme.type === "musical_chair",
        },
        {
            href: "brain-games",
            label: "Live quiz console",
            icon: Brain02Icon,
            show: programme.type === "quiz",
        },
        {
            href: "drawings",
            label: "Drawings & voting",
            icon: PaintBoardIcon,
            show: programme.type === "drawing",
        },
        { href: "results", label: "Results", icon: Award01Icon, show: true },
    ].filter((t) => t.show);

    return (
        <AdminPermissions flags={can}>
            <AdminTitle
                title={programme.title_en}
                description={`/${programme.slug}`}
                actions={
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/programmes/${programme.slug}`} target="_blank">
                            View public page
                        </Link>
                    </Button>
                }
            />
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {tools.map((t) => (
                    <Link
                        key={t.href}
                        href={`/admin/programmes/${programme.id}/${t.href}`}
                        className="flex items-center gap-3 rounded-2xl border bg-card p-4 font-medium transition-colors hover:border-marigold/60"
                    >
                        <HugeiconsIcon icon={t.icon} className="size-5 text-primary" />
                        {t.label}
                    </Link>
                ))}
            </div>
            {/* Without update the settings stay visible but can't be changed. */}
            <fieldset disabled={!can.update} className="min-w-0">
                <AdminCard className="mb-8">
                    <QuickToggles programme={programme} />
                </AdminCard>
                <ProgrammeForm programme={programme} />
            </fieldset>
            {can.delete && (
                <div className="mt-12 border-t pt-6">
                    <DeleteProgramme id={programme.id} title={programme.title_en} />
                </div>
            )}
        </AdminPermissions>
    );
}
