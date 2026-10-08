import Link from "next/link";
import { AdminCard, AdminTitle, Stat } from "@/components/admin/admin-bits";
import { Badge } from "@/components/ui/badge";
import { formatIst } from "@/lib/datetime";
import {
    countRegistrationsByProgramme,
    listFeedback,
    listProgrammes,
    listSongRequests,
} from "@/lib/queries";

export default async function AdminDashboard() {
    const [programmes, counts, requests, feedback] = await Promise.all([
        listProgrammes(),
        countRegistrationsByProgramme(),
        listSongRequests(),
        listFeedback(),
    ]);
    const totalRegistrations = [...counts.values()].reduce((a, b) => a + b, 0);
    const pendingRequests = requests.filter((r) => r.status === "pending");
    const newFeedback = feedback.filter((f) => f.status === "new");

    return (
        <>
            <AdminTitle
                title="Dashboard"
                description="Everything happening across the Puja at a glance."
            />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat
                    label="Programmes"
                    value={programmes.length}
                    hint={`${programmes.filter((p) => p.status === "completed").length} completed`}
                />
                <Stat label="Registrations" value={totalRegistrations} />
                <Stat label="Song requests waiting" value={pendingRequests.length} />
                <Stat label="New feedback" value={newFeedback.length} />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <AdminCard title="Programmes">
                    <ul className="divide-y">
                        {programmes.map((p) => (
                            <li key={p.id}>
                                <Link
                                    href={`/admin/programmes/${p.id}`}
                                    className="flex items-center gap-3 py-2.5 hover:text-primary"
                                >
                                    <span className="flex-1 truncate font-medium">
                                        {p.title_en}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {counts.get(p.id) ?? 0} signed up
                                    </span>
                                    <Badge variant="secondary">{p.status}</Badge>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </AdminCard>

                <div className="space-y-6">
                    <AdminCard title="Song requests">
                        {pendingRequests.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nothing waiting.</p>
                        ) : (
                            <ul className="space-y-2 text-sm">
                                {pendingRequests.slice(0, 5).map((r) => (
                                    <li key={r.id} className="flex justify-between gap-3">
                                        <span className="truncate">{r.title}</span>
                                        <span className="text-muted-foreground">
                                            ×{r.request_count}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <Link
                            href="/admin/song-requests"
                            className="mt-3 inline-block text-sm font-semibold text-primary"
                        >
                            Review requests →
                        </Link>
                    </AdminCard>

                    <AdminCard title="Latest feedback">
                        {newFeedback.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No new feedback.</p>
                        ) : (
                            <ul className="space-y-3 text-sm">
                                {newFeedback.slice(0, 3).map((f) => (
                                    <li key={f.id}>
                                        <Badge variant="outline">{f.kind}</Badge>
                                        <p className="mt-1 line-clamp-2">{f.message}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatIst(f.created_at)}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <Link
                            href="/admin/feedback"
                            className="mt-3 inline-block text-sm font-semibold text-primary"
                        >
                            Open inbox →
                        </Link>
                    </AdminCard>
                </div>
            </div>
        </>
    );
}
