import type { MetadataRoute } from "next";
import { listEditions, listProgrammes } from "@/lib/queries";
import { SITE_URL } from "@/lib/site";

const STATIC: {
    path: string;
    priority: number;
    changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
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
        const [programmes, editions] = await Promise.all([listProgrammes(), listEditions()]);
        return [
            ...pages,
            ...editions
                .filter((e) => !e.is_current)
                .map((e) => ({
                    url: `${SITE_URL}/archive/${e.year}`,
                    lastModified: now,
                    changeFrequency: "yearly" as const,
                    priority: 0.5,
                })),
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
