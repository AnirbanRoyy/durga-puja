import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { AdminNav } from "@/components/admin/admin-nav";
import { isAdmin } from "@/lib/auth";
import en from "../../../../messages/en.json";

export const metadata = {
    title: { default: "Admin", template: "%s · Admin" },
    robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
    if (!(await isAdmin())) redirect("/admin/login");
    return (
        <div className="flex min-h-screen flex-col lg:flex-row">
            <AdminNav />
            {/* The admin area is English whatever language the public site is set to; the shared
                registration form and back button read their text from here. */}
            <NextIntlClientProvider locale="en" messages={{ forms: en.forms, nav: en.nav }}>
                <main className="min-w-0 flex-1 px-4 py-6 lg:px-10 lg:py-10">{children}</main>
            </NextIntlClientProvider>
        </div>
    );
}
