"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import {
    saveAmbientSettings,
    saveDonationSettings,
    saveEventSettings,
} from "@/actions/admin/content";
import { UploadButton } from "@/components/admin/upload-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isoToIstLocal } from "@/lib/datetime";
import type { AmbientSettings, DonationSettings, EventSettings } from "@/lib/queries";
import { initialActionState } from "@/lib/validators";

function Labeled({
    label,
    children,
    hint,
}: {
    label: string;
    children: React.ReactNode;
    hint?: string;
}) {
    return (
        <div className="grid gap-1.5">
            <Label>{label}</Label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

function Message({ ok, code }: { ok: boolean; code?: string }) {
    if (!code) return null;
    return <p className={ok ? "text-sm text-success" : "text-sm text-destructive"}>{code}</p>;
}

export function EventForm({ event }: { event: EventSettings }) {
    const [state, action, pending] = useActionState(saveEventSettings, initialActionState);
    return (
        <form action={action} className="grid gap-4 sm:grid-cols-2">
            <Labeled label="Festival name (English)">
                <Input name="name_en" defaultValue={event.name_en} required />
            </Labeled>
            <Labeled label="Festival name (বাংলা)">
                <Input name="name_bn" defaultValue={event.name_bn} />
            </Labeled>
            <Labeled label="Mahalaya (IST)">
                <Input
                    name="mahalaya"
                    type="datetime-local"
                    defaultValue={isoToIstLocal(event.mahalaya)}
                    required
                />
            </Labeled>
            <Labeled
                label="Shashthi starts (IST)"
                hint="The homepage countdown counts down to this moment, and the timeline names days from here."
            >
                <Input
                    name="shashthi"
                    type="datetime-local"
                    defaultValue={isoToIstLocal(event.shashthi)}
                    required
                />
            </Labeled>
            <Labeled label="Dashami ends (IST)">
                <Input
                    name="dashami"
                    type="datetime-local"
                    defaultValue={isoToIstLocal(event.dashami)}
                    required
                />
            </Labeled>
            <Labeled label="Venue">
                <Input name="venue" defaultValue={event.venue} />
            </Labeled>
            <div className="flex items-center gap-4 sm:col-span-2">
                <Button type="submit" disabled={pending}>
                    Save event
                </Button>
                <Message ok={state.ok} code={state.code} />
            </div>
        </form>
    );
}

export function DonationForm({ donation }: { donation: DonationSettings }) {
    const [state, action, pending] = useActionState(saveDonationSettings, initialActionState);
    const [qr, setQr] = useState(donation.qr_image_url ?? "");
    return (
        <form action={action} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="qr_image_url" value={qr} />
            <div className="flex items-center gap-4 sm:col-span-2">
                <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white">
                    {qr ? (
                        <Image
                            src={qr}
                            alt="Donation QR"
                            width={112}
                            height={112}
                            className="size-full object-contain"
                        />
                    ) : (
                        <span className="px-2 text-center text-xs text-neutral-500">No QR yet</span>
                    )}
                </div>
                <div className="space-y-2">
                    <UploadButton
                        kind="image"
                        folder="donation"
                        variant="outline"
                        onUploaded={(file) => setQr(file.url)}
                    >
                        {qr ? "Replace QR image" : "Upload QR image"}
                    </UploadButton>
                    <p className="text-xs text-muted-foreground">
                        Upload, then press Save donation settings.
                    </p>
                </div>
            </div>
            <Labeled
                label="UPI ID"
                hint="Enables the copy button and “Pay with UPI app” on phones."
            >
                <Input name="upi_id" defaultValue={donation.upi_id ?? ""} placeholder="name@bank" />
            </Labeled>
            <Labeled label="Payee name">
                <Input name="payee_name" defaultValue={donation.payee_name ?? ""} />
            </Labeled>
            <Labeled label="Message (English)">
                <Textarea name="note_en" rows={2} defaultValue={donation.note_en ?? ""} />
            </Labeled>
            <Labeled label="Message (বাংলা)">
                <Textarea name="note_bn" rows={2} defaultValue={donation.note_bn ?? ""} />
            </Labeled>
            <div className="flex items-center gap-4 sm:col-span-2">
                <Button type="submit" disabled={pending}>
                    Save donation settings
                </Button>
                <Message ok={state.ok} code={state.code} />
            </div>
        </form>
    );
}

export function AmbientForm({ ambient }: { ambient: AmbientSettings }) {
    const [state, action, pending] = useActionState(saveAmbientSettings, initialActionState);
    const [url, setUrl] = useState(ambient.audio_url ?? "");
    return (
        <form action={action} className="grid gap-4">
            <input type="hidden" name="audio_url" value={url} />
            <p className="text-sm text-muted-foreground">
                A looping track (e.g. dhak beats) that every visitor can switch on from the drum
                button in the header. It never starts by itself, and plays at 50% volume. Use a
                seamless loop of 30–90 seconds as an MP3 or OGG.
            </p>
            {url && <audio src={url} controls loop className="w-full" />}
            <div className="flex flex-wrap items-center gap-3">
                <UploadButton
                    kind="audio"
                    folder="ambient"
                    variant="outline"
                    onUploaded={(file) => setUrl(file.url)}
                >
                    {url ? "Replace track" : "Upload track"}
                </UploadButton>
                {url && (
                    <Button type="button" variant="ghost" onClick={() => setUrl("")}>
                        Remove track
                    </Button>
                )}
            </div>
            <div className="flex items-center gap-4">
                <Button type="submit" disabled={pending}>
                    Save background music
                </Button>
                <Message ok={state.ok} code={state.code} />
            </div>
        </form>
    );
}
