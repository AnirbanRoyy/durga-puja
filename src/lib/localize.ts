/** Picks the Bengali value when requested and available, falling back to English. */
export function pick(locale: string, en: string, bn: string | null | undefined): string;
export function pick(
    locale: string,
    en: string | null | undefined,
    bn: string | null | undefined,
): string | null;
export function pick(locale: string, en: string | null | undefined, bn: string | null | undefined) {
    if (locale === "bn" && bn) return bn;
    return en ?? bn ?? null;
}
