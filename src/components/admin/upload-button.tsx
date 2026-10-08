"use client";

import type { ReactNode } from "react";
import { CldUploadWidget, type CloudinaryUploadWidgetResults } from "next-cloudinary";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Upload01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

export type UploadedFile = {
    url: string;
    publicId: string;
    width: number | null;
    height: number | null;
    duration: number | null;
    originalName: string;
};

/**
 * Signed Cloudinary upload (signature comes from /api/cloudinary/sign, admin only).
 * Audio is uploaded as resource_type "video", which is how Cloudinary stores audio.
 */
export function UploadButton({
    kind,
    folder,
    multiple = false,
    onUploaded,
    children,
    variant = "default",
}: {
    kind: "image" | "audio";
    folder: string;
    multiple?: boolean;
    onUploaded: (file: UploadedFile) => void | Promise<void>;
    children?: ReactNode;
    variant?: "default" | "outline" | "secondary";
}) {
    function handleSuccess(results: CloudinaryUploadWidgetResults) {
        const info = results.info;
        if (!info || typeof info === "string") return;
        Promise.resolve(
            onUploaded({
                url: info.secure_url,
                publicId: info.public_id,
                width: info.width ?? null,
                height: info.height ?? null,
                duration: typeof info.duration === "number" ? info.duration : null,
                originalName: info.original_filename ?? "",
            }),
        ).catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Upload failed"));
    }

    return (
        <CldUploadWidget
            signatureEndpoint="/api/cloudinary/sign"
            onSuccess={handleSuccess}
            onError={() => toast.error("Upload failed")}
            options={{
                folder: `durga-puja/${folder}`,
                multiple,
                maxFiles: multiple ? 30 : 1,
                resourceType: kind === "audio" ? "video" : "image",
                clientAllowedFormats:
                    kind === "audio"
                        ? ["mp3", "m4a", "wav", "ogg", "aac"]
                        : ["jpg", "jpeg", "png", "webp", "heic"],
                maxFileSize: kind === "audio" ? 30_000_000 : 10_000_000,
                sources: ["local", "camera"],
            }}
        >
            {({ open }) => (
                <Button type="button" variant={variant} onClick={() => open()}>
                    <HugeiconsIcon icon={Upload01Icon} data-icon="inline-start" />
                    {children ?? (kind === "audio" ? "Upload MP3" : "Upload image")}
                </Button>
            )}
        </CldUploadWidget>
    );
}
