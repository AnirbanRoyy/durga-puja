export type Gender = "male" | "female";
export const MC_CATEGORIES = ["kids", "men", "women"] as const;
export type MusicalChairCategory = (typeof MC_CATEGORIES)[number];

/** Anyone older than this is an adult and must give their gender. */
export const KIDS_MAX_AGE = 17;

export const CATEGORY_LABEL: Record<MusicalChairCategory, string> = {
    kids: "Kids",
    men: "Men",
    women: "Women",
};

export function isAdult(age: number | null): boolean {
    return age != null && age > KIDS_MAX_AGE;
}

/** Null when the age is missing, or an adult has no gender yet (the admin sets it). */
export function categoryOf(age: number | null, gender: Gender | null): MusicalChairCategory | null {
    if (age == null) return null;
    if (age <= KIDS_MAX_AGE) return "kids";
    if (gender === "male") return "men";
    if (gender === "female") return "women";
    return null;
}

export type MusicalChairPlayer = {
    registrationId: string;
    name: string;
    age: number | null;
    category: MusicalChairCategory | null;
};
