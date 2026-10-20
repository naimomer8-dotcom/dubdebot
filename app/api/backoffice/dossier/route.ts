import { db } from "@/lib/supabase";
import { getAdmin, json } from "@/lib/adminAuth";
import { buildDossier } from "@/lib/dossier";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Back-office: download a member's full business file ("התיק העסקי") as a Word document. Admin session only. */
export async function GET(req: Request) {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const userId = new URL(req.url).searchParams.get("userId") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(userId)) return json({ error: "bad user" }, 400);
  try {
    const out = await buildDossier(userId, admin.displayName);
    if (!out) return json({ error: "not found" }, 404);
    await db().from("admin_audit").insert({ admin_id: admin.id, user_id: userId, action: "dossier_download", meta: {} });
    return new Response(new Uint8Array(out.buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="business-file.docx"; filename*=UTF-8''${encodeURIComponent(out.filename)}`,
        "Cache-Control": "no-store, private",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (e) {
    console.error("dossier failed", (e as Error).message);
    return json({ error: "build failed" }, 500);
  }
}
