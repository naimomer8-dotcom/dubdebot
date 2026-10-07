/** Fire-and-forget POST to a Make webhook. Never throws. */
export async function sendToMake(url: string | undefined, payload: unknown) {
  if (!url) return { ok: false, skipped: true };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok };
  } catch (e) {
    console.error("Make webhook failed", e);
    return { ok: false };
  }
}
