import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logout01Icon, SquareLock01Icon } from "@hugeicons/core-free-icons";
import { logout } from "@/actions/admin-auth";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { PERMISSION_DENIED_MESSAGE } from "@/constants";
import { hasAnyAccess } from "@/lib/access-rules";
import { getAdminSession } from "@/lib/permissions";

export const metadata = { title: "No access", robots: { index: false, follow: false } };

// Outside the (protected) layout on purpose: people who can't use the portal at all land here too,
// and the layout would send them straight back.
export default async function NoAccessPage() {
    const session = await getAdminSession();
    const canUsePortal = session !== null && hasAnyAccess(session);
    return (
        <main className="grid min-h-screen grid-cols-1 place-items-center px-4">
            <div className="w-full max-w-sm rounded-3xl border bg-card p-8 text-center shadow-lg">
                <div className="flex justify-center">
                    <BrandMark size={48} />
                </div>
                <HugeiconsIcon
                    icon={SquareLock01Icon}
                    className="mx-auto mt-4 size-8 text-primary"
                />
                <h1 className="mt-3 text-2xl font-semibold">
                    {canUsePortal
                        ? "You don't have access to this page"
                        : "You don't have access to the admin portal"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {PERMISSION_DENIED_MESSAGE} Ask the Super Admin if you need it.
                </p>
                {session && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        Signed in as {session.name} ({session.roleName})
                    </p>
                )}
                <div className="mt-6 grid grid-cols-1 gap-2">
                    {canUsePortal && (
                        <Button asChild>
                            <Link href="/admin">Go to the dashboard</Link>
                        </Button>
                    )}
                    <form action={logout} className="grid grid-cols-1">
                        <Button type="submit" variant="outline">
                            <HugeiconsIcon icon={Logout01Icon} data-icon="inline-start" />
                            Log out
                        </Button>
                    </form>
                </div>
            </div>
        </main>
    );
}
