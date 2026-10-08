import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/session-token";

const VISITOR_COOKIE = "dp_vid";

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Optimistic check only; every admin action re-verifies with requireAdmin().
    if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
        const ok = await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);
        if (!ok) {
            const url = request.nextUrl.clone();
            url.pathname = "/admin/login";
            url.search = `?next=${encodeURIComponent(pathname)}`;
            return NextResponse.redirect(url);
        }
    }

    const response = NextResponse.next();
    if (!request.cookies.has(VISITOR_COOKIE)) {
        response.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
        });
    }
    return response;
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|mp3)$).*)",
    ],
};
