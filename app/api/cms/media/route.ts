import { z } from "zod";
import {
  cmsUnauthorizedResponse,
  isAdminRequest,
} from "../../../../lib/cms/admin-auth.ts";
import {
  listCustomMedia,
  saveCustomMedia,
} from "../../../../lib/cms/custom-store.ts";

const MAX_MEDIA_BYTES = 2 * 1024 * 1024; // 2 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const EXTENSION_MIME_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
};

const jsonUploadSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required."),
  mimeType: z.string().trim().min(1, "MIME type is required."),
  dataBase64: z.string().trim().min(1, "Image dataBase64 is required."),
});

function normalizeMimeType(rawMime: string, filename: string): string {
  const cleaned = rawMime.split(";")[0]?.trim().toLowerCase() ?? "";
  if (cleaned === "image/jpg") {
    return "image/jpeg";
  }
  if (cleaned) {
    return cleaned;
  }
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME_MAP[ext] ?? "";
}

function parseBase64Payload(raw: string): { cleanBase64: string; bytes: Buffer } | null {
  let payload = raw.trim();
  if (payload.startsWith("data:")) {
    const commaIdx = payload.indexOf(",");
    if (commaIdx < 0) return null;
    payload = payload.slice(commaIdx + 1).trim();
  }
  const compact = payload.replace(/\s+/g, "");
  if (!compact || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 !== 0) {
    return null;
  }
  const bytes = Buffer.from(compact, "base64");
  if (bytes.byteLength === 0) {
    return null;
  }
  return { cleanBase64: compact, bytes };
}

export async function GET(req: Request): Promise<Response> {
  if (!(await isAdminRequest(req))) {
    return cmsUnauthorizedResponse();
  }

  const media = await listCustomMedia();
  return Response.json(
    { media },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(req: Request): Promise<Response> {
  if (!(await isAdminRequest(req))) {
    return cmsUnauthorizedResponse();
  }

  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();

  let filename = "";
  let mimeType = "";
  let bytesBase64 = "";
  let sizeBytes = 0;

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return Response.json(
        { error: "Invalid multipart/form-data payload." },
        { status: 400 }
      );
    }

    const fileEntry = formData.get("file");
    if (
      !fileEntry ||
      typeof fileEntry === "string" ||
      typeof fileEntry.arrayBuffer !== "function"
    ) {
      return Response.json(
        { error: 'Expected a "file" field in multipart/form-data.' },
        { status: 400 }
      );
    }

    filename = ("name" in fileEntry && typeof fileEntry.name === "string"
      ? fileEntry.name
      : "upload.png"
    ).trim();
    mimeType = normalizeMimeType(fileEntry.type ?? "", filename);

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return Response.json(
        {
          error:
            "Unsupported image type. Allowed formats: PNG, JPEG, WebP, AVIF, GIF.",
        },
        { status: 400 }
      );
    }

    const arrayBuf = await fileEntry.arrayBuffer();
    sizeBytes = arrayBuf.byteLength;
    if (sizeBytes === 0) {
      return Response.json(
        { error: "Uploaded file is empty." },
        { status: 400 }
      );
    }
    if (sizeBytes > MAX_MEDIA_BYTES) {
      return Response.json(
        { error: "Image exceeds the 2 MB maximum upload limit." },
        { status: 413 }
      );
    }

    bytesBase64 = Buffer.from(arrayBuf).toString("base64");
  } else {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON or multipart/form-data upload payload." },
        { status: 400 }
      );
    }

    const parsed = jsonUploadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return Response.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid media upload payload.",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    filename = parsed.data.filename;
    mimeType = normalizeMimeType(parsed.data.mimeType, filename);

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return Response.json(
        {
          error:
            "Unsupported image type. Allowed formats: PNG, JPEG, WebP, AVIF, GIF.",
        },
        { status: 400 }
      );
    }

    const decoded = parseBase64Payload(parsed.data.dataBase64);
    if (!decoded) {
      return Response.json(
        { error: "Invalid or empty base64 image payload." },
        { status: 400 }
      );
    }

    sizeBytes = decoded.bytes.byteLength;
    if (sizeBytes > MAX_MEDIA_BYTES) {
      return Response.json(
        { error: "Image exceeds the 2 MB maximum upload limit." },
        { status: 413 }
      );
    }

    bytesBase64 = decoded.cleanBase64;
  }

  const media = await saveCustomMedia({
    filename,
    mimeType,
    bytesBase64,
    sizeBytes,
  });

  return Response.json(
    { media },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
