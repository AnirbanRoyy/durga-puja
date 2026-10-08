import { isAdmin } from "@/lib/auth";
import { signUploadParams } from "@/lib/cloudinary";

export async function POST(request: Request) {
    if (!(await isAdmin())) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { paramsToSign } = (await request.json()) as {
        paramsToSign?: Record<string, string | number>;
    };
    if (!paramsToSign || typeof paramsToSign !== "object") {
        return Response.json({ error: "Bad request" }, { status: 400 });
    }
    return Response.json({ signature: signUploadParams(paramsToSign) });
}
