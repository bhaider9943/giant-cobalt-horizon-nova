import { Download, Upload } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useClientsStore } from "@/lib/clients-store";
import { CSV_TEMPLATE, parseClientsCsv } from "@/lib/parse-clients-csv";
import { cn } from "@/lib/utils";

const MAX_BYTES = 512 * 1024;

function applyCsvText(text: string) {
  const result = parseClientsCsv(text);
  if (result.error) {
    useClientsStore.setState({ importNotice: { ok: false, message: result.error } });
    return;
  }
  const extra =
    result.unmatched.length > 0
      ? ` · ${result.unmatched.length} unmatched (${result.unmatched.slice(0, 3).join(", ")}${result.unmatched.length > 3 ? "…" : ""})`
      : "";
  useClientsStore.getState().replaceCounts(result.counts, {
    ok: true,
    message: `Loaded ${result.matched} rows${extra}`,
  });
}

export function CsvUpload({ className }: { className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      useClientsStore.setState({
        importNotice: { ok: false, message: "File is too large (512 KB max)." },
      });
      return;
    }
    const text = await file.text();
    applyCsvText(text);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clients-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <input
        ref={inputRef}
        id="csv-upload-rail"
        type="file"
        accept=".csv,text/csv,text/tab-separated-values,.tsv"
        className="sr-only"
        aria-label="Clients CSV file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          void onFile(file);
          e.target.value = "";
        }}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => inputRef.current?.click()}
        >
          <Upload />
          Upload CSV
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={downloadTemplate}
          aria-label="Download CSV template"
        >
          <Download />
          Template
        </Button>
      </div>
    </div>
  );
}

export function HeaderCsvButton() {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        id="csv-upload-header"
        type="file"
        accept=".csv,text/csv,text/tab-separated-values,.tsv"
        className="sr-only"
        aria-label="Upload clients CSV"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > MAX_BYTES) {
            useClientsStore.setState({
              importNotice: { ok: false, message: "File is too large (512 KB max)." },
            });
            e.target.value = "";
            return;
          }
          void file.text().then(applyCsvText);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        aria-label="Upload clients CSV"
      >
        <Upload />
        <span className="hidden sm:inline">Upload CSV</span>
        <span className="sm:hidden">CSV</span>
      </Button>
    </>
  );
}
