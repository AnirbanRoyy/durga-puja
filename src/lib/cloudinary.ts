import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { serverEnv } from "@/lib/env";

function configure() {
    cloudinary.config({
        cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
        api_secret: serverEnv.cloudinaryApiSecret(),
        secure: true,
    });
    return cloudinary;
}

/** Signs the params the upload widget sends so only the admin can upload. */
export function signUploadParams(params: Record<string, string | number>): string {
    return configure().utils.api_sign_request(params, serverEnv.cloudinaryApiSecret());
}

export async function destroyCloudinaryAsset(publicId: string, resourceType: "image" | "video") {
    try {
        await configure().uploader.destroy(publicId, {
            resource_type: resourceType,
            invalidate: true,
        });
    } catch (error) {
        // The DB row is the source of truth; an orphaned file is not worth failing the delete.
        console.error("cloudinary destroy failed", publicId, error);
    }
}
