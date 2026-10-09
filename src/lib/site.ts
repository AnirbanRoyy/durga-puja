/** Canonical origin used for metadata, sitemap and structured data. Set NEXT_PUBLIC_SITE_URL in production. */
export const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NODE_ENV === "production"
        ? "https://sodepur-durga-puja.vercel.app"
        : "http://localhost:3000")
).replace(/\/$/, "");
