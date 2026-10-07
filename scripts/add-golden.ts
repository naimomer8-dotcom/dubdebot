/**
 * Add answers Nir approved ("תשובות זהב"). Input: golden.json = [{ "question": "...", "answer": "..." }]
 *   npx tsx scripts/add-golden.ts golden.json
 */
import fs from "fs";
import { embedBatch, supabase } from "./lib";

(async () => {
  const items: { question: string; answer: string }[] = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const vectors = await embedBatch(items.map((i) => i.question));
  const { error } = await supabase
    .from("golden_answers")
    .insert(items.map((it, i) => ({ question: it.question, answer: it.answer, embedding: vectors[i] })));
  if (error) throw error;
  console.log(`✓ ${items.length} golden answers added`);
})();
