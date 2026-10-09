import type { MetadataRoute } from "next";
import { listProgrammes } from "@/lib/queries";
import { SITE_URL } from "@/lib/site";

const STATIC: {
    path: string;
    priority: number;
    changeFrequency: "daily" | "weekly" | "monthly";
}[] = [
    { path: "", priority: 1, changeFrequency: "daily" },
    { path: "/programmes", priority: 0.9, changeFrequency: "daily" },
    { path: "/timeline", priority: 0.9, changeFrequency: "weekly" },
    { path: "/results", priority: 0.8, changeFrequency: "daily" },
    { path: "/music", priority: 0.7, changeFrequency: "weekly" },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/community", priority: 0.6, changeFrequency: "monthly" },
    { path: "/donate", priority: 0.5, changeFrequency: "monthly" },
    { path: "/feedback", priority: 0.4, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();
    const pages = STATIC.map(({ path, priority, changeFrequency }) => ({
        url: `${SITE_URL}${path}`,
        lastModified: now,
        changeFrequency,
        priority,
    }));
    try {
        const programmes = await listProgrammes();
        return [
            ...pages,
            ...programmes.map((p) => ({
                url: `${SITE_URL}/programmes/${p.slug}`,
                lastModified: now,
                changeFrequency: "weekly" as const,
                priority: 0.7,
            })),
        ];
    } catch {
        return pages;
    }
}
