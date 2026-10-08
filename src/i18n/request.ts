import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";

export default getRequestConfig(async () => {
    const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
    const locale = isLocale(stored) ? stored : defaultLocale;
    return {
        locale,
        timeZone: "Asia/Kolkata",
        messages: (await import(`../../messages/${locale}.json`)).default,
    };
});
