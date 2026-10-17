import { canWriteAnything } from "@/lib/access-rules";
import { signUploadParams } from "@/lib/cloudinary";
import { getAdminSession } from "@/lib/permissions";

// Uploads only put a file on Cloudinary; the database write that uses it is checked by its own
// server action. So any signed-in admin who may create or change something may upload.
export async function POST(request: Request) {
    const session = await getAdminSession();
    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canWriteAnything(session)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const { paramsToSign } = (await request.json()) as {
        paramsToSign?: Record<string, string | number>;
    };
    if (!paramsToSign || typeof paramsToSign !== "object") {
        return Response.json({ error: "Bad request" }, { status: 400 });
    }
    return Response.json({ signature: signUploadParams(paramsToSign) });
}
