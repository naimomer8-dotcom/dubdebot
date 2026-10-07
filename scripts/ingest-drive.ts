/**
 * Ingest Nir's books & booklets into the knowledge base.
 *
 * 1. Download the Drive folder and put the files under ./knowledge (sub-folders are fine)
 * 2. npm run ingest:drive            (add --dry to only preview the extracted text)
 *
 * Client work plans are skipped on purpose: they contain real client names and numbers.
 */
import fs from "fs";
import path from "path";
import { upsertSource } from "./lib";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require("mammoth");

const ROOT = path.resolve("knowledge");
const DRY = process.argv.includes("--dry");

// never index these (real client data)
const SKIP = [/ניב כרמל/, /רונישופ/, /ירון קטן/, /מיתר/, /מכללה/, /BIG STOCK/i, /תחזית כלכלית/, /logo|לוגו/i];
const BOOKS = [/ארנב/, /משתפן/, /אלפא/, /עצמאו/];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}

const hebrew = /[֐-׿]/;
/** Some Hebrew PDFs extract in visual order (reversed). Detect & fix line by line. */
function fixReversedHebrew(text: string) {
  const common = ["של", "את", "לא", "זה", "על", "עם", "אני", "כל", "מה", "אם"];
  const score = (t: string) => common.reduce((n, w) => n + (t.split(` ${w} `).length - 1), 0);
  const reversed = text
    .split("\n")
    .map((l) => (hebrew.test(l) ? [...l].reverse().join("") : l))
    .join("\n");
  return score(reversed) > score(text) * 1.5 ? reversed : text;
}

async function extract(file: string): Promise<string> {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".pdf") {
    const data = await pdf(fs.readFileSync(file));
    const perPage = data.text.length / Math.max(1, data.numpages);
    if (perPage < 150) console.warn(`  ⚠️  very little text (${Math.round(perPage)} chars/page) – probably scanned, needs OCR`);
    return fixReversedHebrew(data.text);
  }
  if (ext === ".docx") return (await mammoth.extractRawText({ path: file })).value;
  if (ext === ".txt" || ext === ".md") return fs.readFileSync(file, "utf8");
  return "";
}

(async () => {
  if (!fs.existsSync(ROOT)) throw new Error("put the files in ./knowledge first");
  const files = walk(ROOT).filter((f) => /\.(pdf|docx|txt|md)$/i.test(f));
  let total = 0;
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (SKIP.some((r) => r.test(rel))) {
      console.log(`⏭  skip (client/private): ${rel}`);
      continue;
    }
    // book name = top-level folder if the file sits inside one, else the file name
    const parts = rel.split(path.sep);
    const source = (parts.length > 1 ? parts[0] : path.parse(rel).name).replace(/\s*\(\d+\)$/, "");
    const sourceType = BOOKS.some((r) => r.test(source)) ? "book" : "booklet";
    console.log(`📖 ${rel}  →  "${source}" [${sourceType}]`);
    const text = await extract(file);
    if (text.trim().length < 200) {
      console.warn("  ⚠️  no usable text, skipped");
      continue;
    }
    if (DRY) {
      console.log("  sample:", text.slice(0, 300).replace(/\n/g, " ⏎ "));
      continue;
    }
    // several PDFs of the same book (chapters) → keep them under the same source but distinct titles
    const n = await upsertSource({ source: parts.length > 1 ? `${source} / ${path.parse(rel).name}` : source, sourceType, title: source, text });
    console.log(`  ✓ ${n} chunks`);
    total += n;
  }
  console.log(`\nDone. ${total} chunks indexed.`);
})();
