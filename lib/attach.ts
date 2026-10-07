"use client";

export type Prepared = {
  id: string;
  name: string;
  mime: string;
  kind: "image" | "pdf" | "doc";
  data?: string; // base64 (images / pdf)
  text?: string; // extracted text (sheets / docs)
  preview?: string; // thumbnail data URL
  size: number;
};

export const ACCEPT = "image/*,application/pdf,.xlsx,.xls,.csv,.docx,.txt,.md,.json";
const PDF_MAX = 3_300_000;
const TEXT_MAX = 40_000;

function b64(buf: ArrayBuffer) {
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function shrinkImage(file: File): Promise<{ data: string; preview: string; size: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const max = 1600;
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.82);
    const t = document.createElement("canvas");
    const tk = 96 / Math.max(c.width, c.height);
    t.width = Math.round(c.width * tk);
    t.height = Math.round(c.height * tk);
    t.getContext("2d")!.drawImage(c, 0, 0, t.width, t.height);
    const data = dataUrl.split(",")[1];
    return { data, preview: t.toDataURL("image/jpeg", 0.7), size: Math.floor((data.length * 3) / 4) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Turns a user file into something Gemini can read: compressed image, PDF bytes, or extracted text. */
export async function prepareFile(file: File): Promise<Prepared> {
  const id = Math.random().toString(36).slice(2);
  const name = file.name;
  const lower = name.toLowerCase();

  if (file.type.startsWith("image/")) {
    const r = await shrinkImage(file);
    return { id, name, mime: "image/jpeg", kind: "image", data: r.data, preview: r.preview, size: r.size };
  }
  if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
    if (file.size > PDF_MAX) throw new Error("ה-PDF גדול מדי (עד 3MB). נסה לשלוח רק את העמודים החשובים.");
    return { id, name, mime: "application/pdf", kind: "pdf", data: b64(await file.arrayBuffer()), size: file.size };
  }
  if (/\.(xlsx|xls|csv)$/.test(lower)) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    let text = "";
    for (const sn of wb.SheetNames.slice(0, 6)) {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sn], { blankrows: false });
      text += `גיליון: ${sn}\n${csv}\n\n`;
      if (text.length > TEXT_MAX) break;
    }
    return { id, name, mime: "text/csv", kind: "doc", text: text.slice(0, TEXT_MAX), size: file.size };
  }
  if (lower.endsWith(".docx")) {
    const mammoth = (await import("mammoth/mammoth.browser")) as unknown as { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> };
    const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { id, name, mime: "text/plain", kind: "doc", text: r.value.slice(0, TEXT_MAX), size: file.size };
  }
  if (/\.(txt|md|json)$/.test(lower) || file.type.startsWith("text/")) {
    return { id, name, mime: "text/plain", kind: "doc", text: (await file.text()).slice(0, TEXT_MAX), size: file.size };
  }
  throw new Error("סוג הקובץ לא נתמך. אפשר תמונה, PDF, אקסל, CSV או Word.");
}
