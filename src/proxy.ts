import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/session-token";
import { ADMIN_COOKIE, ADMIN_LOGIN_PATH, PATHNAME_HEADER, VISITOR_COOKIE } from "@/constants";

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isAdminPath = pathname.startsWith("/admin");

    // Optimistic sign-in check only; every admin page and action re-checks with checkPermission().
    if (isAdminPath && pathname !== ADMIN_LOGIN_PATH) {
        const subject = await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);
        if (!subject) {
            const url = request.nextUrl.clone();
            url.pathname = ADMIN_LOGIN_PATH;
            url.search = `?next=${encodeURIComponent(pathname)}`;
            return NextResponse.redirect(url);
        }
    }

    // Tell server code which page was asked for (to send people back after signing in). Always
    // overwritten here, so a client can't supply its own.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete(PATHNAME_HEADER);
    if (isAdminPath) {
        requestHeaders.set(PATHNAME_HEADER, pathname);
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } });
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
