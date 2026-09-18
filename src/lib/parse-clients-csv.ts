import { resolveCountryId } from "@/lib/country-lookup";
import { COUNTRY_NAMES } from "@/lib/world";

export type CsvImportResult = {
  counts: Record<string, number>;
  matched: number;
  unmatched: string[];
  error?: string;
};

const NAME_HEADERS = new Set(["country", "nation", "name", "location", "iso", "code", "iso2", "iso3"]);
const COUNT_HEADERS = new Set(["clients", "client", "count", "total", "value", "n", "number", "qty", "quantity"]);

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 8).join("\n");
  const commas = (sample.match(/,/g) ?? []).length;
  const tabs = (sample.match(/\t/g) ?? []).length;
  const semis = (sample.match(/;/g) ?? []).length;
  if (tabs > commas && tabs >= semis) return "\t";
  if (semis > commas) return ";";
  return ",";
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[%\s]/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(99999, Math.round(n));
}

function looksLikeHeader(cells: string[]): boolean {
  const a = cells[0]?.toLowerCase() ?? "";
  const b = cells[1]?.toLowerCase() ?? "";
  if (NAME_HEADERS.has(a)) return true;
  if (COUNT_HEADERS.has(b)) return true;
  if (COUNT_HEADERS.has(a) && NAME_HEADERS.has(b)) return true;
  return false;
}

export function parseClientsCsv(text: string): CsvImportResult {
  const source = text.replace(/^\uFEFF/, "").trim();
  if (!source) return { counts: {}, matched: 0, unmatched: [], error: "The file is empty." };

  const delimiter = detectDelimiter(source);
  const lines = source.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { counts: {}, matched: 0, unmatched: [], error: "The file is empty." };
  }

  let start = 0;
  let nameIdx = 0;
  let countIdx = 1;
  const first = splitCsvLine(lines[0] ?? "", delimiter);
  if (first.length < 2) {
    return {
      counts: {},
      matched: 0,
      unmatched: [],
      error: "Need two columns: country and clients.",
    };
  }

  if (looksLikeHeader(first)) {
    start = 1;
    const lower = first.map((c) => c.toLowerCase());
    const ni = lower.findIndex((c) => NAME_HEADERS.has(c));
    const ci = lower.findIndex((c) => COUNT_HEADERS.has(c));
    if (ni >= 0) nameIdx = ni;
    if (ci >= 0) countIdx = ci;
    if (ni >= 0 && ci < 0) countIdx = ni === 0 ? 1 : 0;
    if (ci >= 0 && ni < 0) nameIdx = ci === 0 ? 1 : 0;
  }

  const counts: Record<string, number> = {};
  const unmatched: string[] = [];
  let matched = 0;

  for (let i = start; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i] ?? "", delimiter);
    const name = cells[nameIdx] ?? "";
    const rawCount = cells[countIdx] ?? "";
    if (!name) continue;
    const n = parseNumber(rawCount);
    if (n === null) {
      unmatched.push(name);
      continue;
    }
    const id = resolveCountryId(name);
    if (!id || !COUNTRY_NAMES[id]) {
      unmatched.push(name);
      continue;
    }
    counts[id] = (counts[id] ?? 0) + n;
    matched += 1;
  }

  if (matched === 0) {
    return {
      counts: {},
      matched: 0,
      unmatched,
      error: unmatched.length
        ? "No rows matched a country. Use names, ISO codes, or download the template."
        : "No client rows found.",
    };
  }

  return { counts, matched, unmatched };
}

export const CSV_TEMPLATE = `country,clients
United States,100
United Kingdom,48
Germany,36
India,3
Pakistan,2
`;
