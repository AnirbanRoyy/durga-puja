import { LoginForm } from "@/components/admin/login-form";
import { Alpana } from "@/components/decor/alpana";

export const metadata = { title: "Organiser login" };

export default async function AdminLoginPage(props: PageProps<"/admin/login">) {
    const { next } = await props.searchParams;
    return (
        <main className="bg-puja-radial relative grid min-h-screen place-items-center overflow-hidden px-4">
            <Alpana className="absolute size-[44rem] animate-spin-slow text-marigold/20" />
            <div className="relative w-full max-w-sm rounded-3xl border bg-card/95 p-8 shadow-2xl backdrop-blur">
                <span className="grid size-12 place-items-center rounded-full bg-primary font-heading text-xl text-primary-foreground">
                    দু
                </span>
                <h1 className="mt-4 text-2xl font-semibold">Organiser login</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Manage programmes, songs and results.
                </p>
                <LoginForm next={typeof next === "string" ? next : ""} />
            </div>
        </main>
    );
}
