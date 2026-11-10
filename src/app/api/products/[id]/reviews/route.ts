import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  resolveEffectiveSecurityLevel,
} from "@/lib/auth";
import { queryDb } from "@/lib/db";

function sanitizeHtmlBasic(input: string, level: string): string {
  if (level === "low") {
    // INJ-02: Zero sanitization in Low mode — allows any <script>, <img onerror=...>, <svg onload=...>
    return input;
  }
  if (level === "medium") {
    // Medium mode: Naive filter stripping lowercase <script>, bypassable via <img src=x onerror=alert(1)> or <SCRIPT>
    return input.replace(/<script>/g, "").replace(/<\/script>/g, "");
  }
  // High / Fixed mode: HTML entity encoding neutralizes Stored XSS
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const productId = Number(id);
  const level = await resolveEffectiveSecurityLevel(req);
  const user = await getAuthenticatedUser(req);
  const body = await req.json().catch(() => ({}));

  const authorName = String(
    body.author_name || user?.full_name || user?.username || "Anonymous Pentester"
  );
  const rating = Math.min(Math.max(Number(body.rating || 5), 1), 5);
  const rawComment = String(body.comment || "");

  if (!rawComment) {
    return NextResponse.json(
      { error: "Review comment is required" },
      { status: 400 }
    );
  }

  const processedComment = sanitizeHtmlBasic(rawComment, level);

  const { rows } = await queryDb(
    `INSERT INTO reviews (product_id, user_id, author_name, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [productId, user?.id || 1, authorName, rating, processedComment],
    { endpoint: `/api/products/${productId}/reviews`, vulnId: "INJ-02 (Stored XSS)" }
  );

  return NextResponse.json({
    ok: true,
    review: rows[0],
    securityLevel: level,
    xssRawStored: level !== "fixed" && level !== "high",
  });
}
