import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  resolveEffectiveSecurityLevel,
} from "@/lib/auth";
import { queryDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const fileId = Number(req.nextUrl.searchParams.get("id") || 0);

  if (!fileId) {
    const { rows } = await queryDb(
      "SELECT id, user_id, filename, content_type, created_at FROM uploaded_files ORDER BY id DESC"
    );
    return NextResponse.json({ files: rows });
  }

  const { rows } = await queryDb(
    "SELECT * FROM uploaded_files WHERE id = $1",
    [fileId],
    { endpoint: "/api/upload", vulnId: "BIZ-03 (File Upload Serve)" }
  );
  const file = rows[0];
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // In Low/Medium mode, serve the uploaded content with its raw Content-Type (allowing HTML/SVG XSS execution)
  const headers: Record<string, string> = {
    "Content-Type":
      level === "fixed" ? "text/plain; charset=utf-8" : file.content_type,
  };
  if (level === "fixed") {
    headers["Content-Disposition"] = `attachment; filename="${file.filename}"`;
    headers["X-Content-Type-Options"] = "nosniff";
  }

  return new NextResponse(file.content_text, {
    status: 200,
    headers,
  });
}

export async function POST(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const currentUser = await getAuthenticatedUser(req);
  const body = await req.json().catch(() => ({}));

  const userId = Number(body.userId || currentUser?.id || 1);
  const filename = String(body.filename || "upload.txt").trim();
  const contentType = String(body.content_type || "text/plain").trim();
  const contentText = String(body.content_text || "");

  if (level === "fixed" || level === "high") {
    const allowedExt = /\.(png|jpg|jpeg|webp)$/i.test(filename);
    const hasDoubleExt = /\.[a-z0-9]+\.[a-z0-9]+$/i.test(filename);
    const allowedMime = ["image/png", "image/jpeg", "image/webp"].includes(
      contentType.toLowerCase()
    );

    if (!allowedExt || hasDoubleExt || !allowedMime) {
      return NextResponse.json(
        {
          error:
            "File Upload Blocked (BIZ-03 Fixed): Only single-extension PNG, JPEG, and WebP images are permitted.",
        },
        { status: 400 }
      );
    }
  } else if (level === "medium") {
    // Medium mode: Naive check blocking only filenames ending strictly in .php or .exe (bypassable via shell.php.jpg or .html/.svg)
    if (/\.(php|exe)$/i.test(filename)) {
      return NextResponse.json(
        {
          error:
            "Medium Filter: Direct .php and .exe extensions are blocked. (Hint: try double extension like shell.php.html or .svg)",
        },
        { status: 400 }
      );
    }
  }

  const { rows } = await queryDb(
    `INSERT INTO uploaded_files (user_id, filename, content_type, content_text)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, filename, content_type, created_at`,
    [userId, filename, contentType, contentText],
    { endpoint: "/api/upload", vulnId: "BIZ-03 (Unrestricted Upload)" }
  );

  return NextResponse.json({
    ok: true,
    file: rows[0],
    viewUrl: `/api/upload?id=${rows[0].id}`,
    securityLevel: level,
  });
}
