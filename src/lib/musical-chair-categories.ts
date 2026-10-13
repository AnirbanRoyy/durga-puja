import { KIDS_MAX_AGE, MC_CATEGORIES } from "@/constants";
export type Gender = "male" | "female";
export type MusicalChairCategory = (typeof MC_CATEGORIES)[number];

export function isAdult(age: number | null): boolean {
    return age != null && age > KIDS_MAX_AGE;
}

/** Null when the age is missing, or an adult has no gender yet (the admin sets it). */
export function categoryOf(age: number | null, gender: Gender | null): MusicalChairCategory | null {
    if (age == null) {
        return null;
    }
    if (age <= KIDS_MAX_AGE) {
        return "kids";
    }
    if (gender === "male") {
        return "men";
    }
    if (gender === "female") {
        return "women";
    }
    return null;
}

export type MusicalChairPlayer = {
    registrationId: string;
    name: string;
    age: number | null;
    category: MusicalChairCategory | null;
};
