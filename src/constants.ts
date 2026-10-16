import type { ProgrammeStatus, ProgrammeType } from "@/lib/database.types";
import type { MusicalChairCategory } from "@/lib/musical-chair-categories";

/** Media query for the large-screen layout (Tailwind's `lg` breakpoint). */
export const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

// Server cache (see src/lib/cache.ts). Bump CACHE_VERSION when a cached shape changes.
export const CACHE_VERSION = "v2";

export const PROGRAMMES_TAG = "programmes";
export const EDITIONS_TAG = "editions";
export const SETTINGS_TAG = "settings";

// Musical chair categories
export const MC_CATEGORIES = ["kids", "men", "women"] as const;

/** Anyone older than this is an adult and must give their gender. */
export const KIDS_MAX_AGE = 17;

export const CATEGORY_LABEL: Record<MusicalChairCategory, string> = {
    kids: "Kids",
    men: "Men",
    women: "Women",
};

// Musical chair game (start offsets are in seconds)
export const MC_EVENT = "state";

export const MIN_START_OFFSET = 20;
export const SHORT_SONG_OFFSET = 15;

// Programmes
export const PROGRAMME_TYPES: ProgrammeType[] = [
    "musical_chair",
    "singing",
    "dance",
    "drawing",
    "quiz",
    "other",
];
export const PROGRAMME_STATUSES: ProgrammeStatus[] = [
    "upcoming",
    "ongoing",
    "completed",
    "cancelled",
];

/** Sign-up size limits for team programmes (pairs are always exactly two). */
export const DEFAULT_TEAM_MIN = 2;
export const DEFAULT_TEAM_MAX = 4;

// Songs
export const SONG_CATEGORIES = [
    "mahalaya",
    "agomoni",
    "dhunuchi",
    "bhajan",
    "modern",
    "bollywood",
    "other",
] as const;

/** Uploaded files (audio, images) must live on our Cloudinary account's CDN. */
export const CLOUDINARY_PREFIX = "https://res.cloudinary.com/";

/** Free-text inputs get the X clear button; numbers, dates, passwords and files don't. */
export const CLEARABLE_INPUT_TYPES = new Set([undefined, "text", "search", "url", "email", "tel"]);

// Pandal stream
/** Songs one network address can add or re-request per year (upvotes don't count). */
export const STREAM_REQUEST_LIMIT = 3;

// Admin session (max age is in seconds)
export const ADMIN_COOKIE = "dp_admin";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

// Access control
/** Reserved username of the Super Admin, who signs in with the password from the environment. */
export const SUPER_ADMIN_USERNAME = "superadmin";
export const SUPER_ADMIN_ROLE_NAME = "Super Admin";
/** Built-in role names in the `roles` table. */
export const SUPER_ADMIN_ROLE = "super-admin";
export const AUDIENCE_ROLE = "audience";
export const PERMISSION_ACTIONS = ["create", "read", "update", "delete"] as const;
/** Parts of the admin portal that aren't a single programme. Mirrors the check in migration 0013. */
export const ADMIN_AREAS = [
    "all_programmes",
    "registrations",
    "stream",
    "songs",
    "song_requests",
    "feedback",
    "years",
    "settings",
] as const;
export const ADMIN_AREA_LABEL: Record<(typeof ADMIN_AREAS)[number], string> = {
    all_programmes: "All programmes",
    registrations: "Registrations (all programmes page)",
    stream: "Pandal stream",
    songs: "Songs",
    song_requests: "Song requests",
    feedback: "Feedback",
    years: "Years",
    settings: "Settings",
};
export const ADMIN_LOGIN_PATH = "/admin/login";
export const NO_ACCESS_PATH = "/admin/no-access";
/** Request header the proxy sets so server code knows which admin page was asked for. */
export const PATHNAME_HEADER = "x-pathname";
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
export const MIN_PASSWORD_LENGTH = 8;
export const PERMISSION_DENIED_MESSAGE = "You don't have permission to do that.";

// Site
/** Canonical origin used for metadata, sitemap and structured data. Set NEXT_PUBLIC_SITE_URL in production. */
export const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NODE_ENV === "production"
        ? "https://sodepur-durga-puja.vercel.app"
        : "http://localhost:3000")
).replace(/\/$/, "");

// Visitor cookie
export const VISITOR_COOKIE = "dp_vid";

// Language
export const LOCALE_COOKIE = "NEXT_LOCALE";

// About page
/** Placeholder paragraph: the page fills in this year's dates from the admin settings. */
export const THIS_YEAR_DATES = "{{this-year-dates}}";

// Pandal stream request form
/** Fired by a "Request again" button with the song's YouTube link. */
export const STREAM_REREQUEST_EVENT = "stream:rerequest";
