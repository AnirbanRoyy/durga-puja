import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";

export default function Loading() {
    return <AdminTableSkeleton back toolbar rows={7} cols={6} />;
}
