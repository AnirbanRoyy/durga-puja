import {
    Archive02Icon,
    Award01Icon,
    Calendar03Icon,
    Home01Icon,
    InformationCircleIcon,
    Message01Icon,
    MusicNote03Icon,
    QrCodeIcon,
    StarIcon,
    WhatsappIcon,
} from "@hugeicons/core-free-icons";

export const NAV_LINKS = [
    { href: "/", key: "home", icon: Home01Icon },
    { href: "/programmes", key: "programmes", icon: StarIcon },
    { href: "/timeline", key: "timeline", icon: Calendar03Icon },
    { href: "/music", key: "music", icon: MusicNote03Icon },
    { href: "/results", key: "results", icon: Award01Icon },
    { href: "/archive", key: "archive", icon: Archive02Icon },
    { href: "/about", key: "about", icon: InformationCircleIcon },
    { href: "/community", key: "community", icon: WhatsappIcon },
    { href: "/feedback", key: "feedback", icon: Message01Icon },
    { href: "/donate", key: "donate", icon: QrCodeIcon },
] as const;

export type NavKey = (typeof NAV_LINKS)[number]["key"];
