import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { isAdmin } from "@/lib/auth";

export const metadata = {
    title: { default: "Admin", template: "%s · Admin" },
    robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
    if (!(await isAdmin())) redirect("/admin/login");
    return (
        <div className="flex min-h-screen flex-col lg:flex-row">
            <AdminNav />
            <main className="min-w-0 flex-1 px-4 py-6 lg:px-10 lg:py-10">{children}</main>
        </div>
    );
}
