"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/admin/native-select";
import {
    DeleteRegistrationButton,
    EditRegistrationButton,
    type RegistrationProgramme,
} from "@/components/admin/registration-actions";
import { Input } from "@/components/ui/input";
import type { RegistrationWithPhone } from "@/lib/queries";
import { formatIst } from "@/lib/datetime";
import { cn } from "@/lib/utils";

const ALL = "all";

/** Every registration of a year in one table, with a programme filter and a name/phone search. */
export function AllRegistrations({
    year,
    years,
    programmes,
    registrations,
}: {
    year: number;
    years: number[];
    programmes: RegistrationProgramme[];
    registrations: RegistrationWithPhone[];
}) {
    const router = useRouter();
    const [programmeId, setProgrammeId] = useState(ALL);
    const [query, setQuery] = useState("");
    const byId = new Map(programmes.map((p) => [p.id, p]));

    const needle = query.trim().toLowerCase();
    const visible = registrations.filter((r) => {
        if (programmeId !== ALL && r.programme_id !== programmeId) return false;
        if (!needle) return true;
        return (
            r.name.toLowerCase().includes(needle) ||
            (r.phone ?? "").includes(needle) ||
            r.members.some((m) => m.name.toLowerCase().includes(needle))
        );
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-1.5">
                    <label htmlFor="reg-year" className="text-xs text-muted-foreground">
                        Year
                    </label>
                    <NativeSelect
                        id="reg-year"
                        value={String(year)}
                        options={years.map(String)}
                        onChange={(e) => router.push(`/admin/registrations?year=${e.target.value}`)}
                        className="w-28"
                    />
                </div>
                <div className="grid gap-1.5">
                    <label htmlFor="reg-programme" className="text-xs text-muted-foreground">
                        Programme
                    </label>
                    <select
                        id="reg-programme"
                        value={programmeId}
                        onChange={(e) => setProgrammeId(e.target.value)}
                        className="h-8 w-56 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                        <option value={ALL}>All programmes</option>
                        {programmes.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.title}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="grid min-w-48 flex-1 gap-1.5">
                    <label htmlFor="reg-search" className="text-xs text-muted-foreground">
                        Search name or phone
                    </label>
                    <Input
                        id="reg-search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search…"
                    />
                </div>
                <p className="pb-1.5 text-sm text-muted-foreground">
                    {visible.length} of {registrations.length}
                </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border bg-card">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                        <tr>
                            <th className="px-4 py-3">Programme</th>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Phone</th>
                            <th className="hidden px-4 py-3 md:table-cell">Signed up</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {visible.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 py-8 text-center text-muted-foreground"
                                >
                                    {registrations.length === 0
                                        ? `Nobody has registered for ${year} yet.`
                                        : "No registrations match."}
                                </td>
                            </tr>
                        )}
                        {visible.map((r) => {
                            const programme = byId.get(r.programme_id);
                            if (!programme) return null;
                            return (
                                <tr key={r.id}>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {programme.title}
                                    </td>
                                    <td className="px-4 py-3 font-medium">
                                        {r.name}
                                        {r.members.length > 0 && (
                                            <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                                                {r.members.map((m, i) => (
                                                    <span key={`${m.role}-${m.name}`}>
                                                        {i > 0 && ", "}
                                                        <span
                                                            className={cn(
                                                                m.role === "leader" &&
                                                                    "font-semibold text-foreground",
                                                            )}
                                                        >
                                                            {m.name}
                                                            {m.role === "leader" && " (leader)"}
                                                        </span>
                                                    </span>
                                                ))}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums">{r.phone}</td>
                                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                                        {formatIst(r.created_at)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-1">
                                            <EditRegistrationButton
                                                registration={r}
                                                programme={programme}
                                            />
                                            <DeleteRegistrationButton
                                                registration={r}
                                                programmeTitle={programme.title}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
