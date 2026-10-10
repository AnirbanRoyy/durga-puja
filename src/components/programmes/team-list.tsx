import { getTranslations } from "next-intl/server";
import type { Registration } from "@/lib/database.types";

/** The teams (or brother–sister pairs) signed up so far, with their members. */
export async function TeamList({ registrations }: { registrations: Registration[] }) {
    const t = await getTranslations("programmes");
    return (
        <section>
            <h2 className="text-2xl font-semibold">{t("teams")}</h2>
            {registrations.length ? (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {registrations.map((team) => (
                        <li key={team.id} className="rounded-2xl border bg-card p-4">
                            <p className="font-semibold break-words">{team.name}</p>
                            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                {team.members.map((member) => (
                                    <li key={`${member.role}-${member.name}`}>
                                        <span className="break-words">{member.name}</span>
                                        {member.role !== "member" && (
                                            <span className="ml-2 rounded-full bg-marigold/25 px-2 py-0.5 text-xs font-medium text-foreground">
                                                {t(`role.${member.role}`)}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-3 text-sm text-muted-foreground">{t("teamsEmpty")}</p>
            )}
        </section>
    );
}
