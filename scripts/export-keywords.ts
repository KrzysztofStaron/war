import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { FSC_CODES } from "../lib/fsc-codes";
import { FSC_KEYWORDS } from "../lib/keywords";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

fs.writeFileSync(
  path.join(root, "lib/keywords-data.json"),
  JSON.stringify(
    { keywords: FSC_KEYWORDS, titles: Object.fromEntries(FSC_CODES.map((c) => [c.code, c.title])) },
    null,
    0
  )
);
