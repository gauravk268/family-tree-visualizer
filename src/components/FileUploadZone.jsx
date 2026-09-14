import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { readCSVFile } from "../utils/dataUtils";

export default function FileUploadZone({ onDataLoaded }) {
  const [dragOver, setDragOver] = useState(false);
  const [entitiesStatus, setEntitiesStatus] = useState(null);
  const [relationsStatus, setRelationsStatus] = useState(null);

  const processFiles = useCallback(async (files) => {
    const fileList = Array.from(files).filter((f) => f.name.endsWith(".csv"));
    if (fileList.length === 0) return;

    let entitiesData = null;
    let relationsData = null;

    for (const file of fileList) {
      try {
        const result = await readCSVFile(file);
        if (result.type === "entities") {
          entitiesData = result.data;
          setEntitiesStatus({ ok: true, count: result.data.length, name: file.name });
        } else if (result.type === "relationships") {
          relationsData = result.data;
          setRelationsStatus({ ok: true, count: result.data.length, name: file.name });
        } else {
          // Try to guess by filename
          const lowerName = file.name.toLowerCase();
          if (lowerName.includes("entit")) {
            entitiesData = result.data;
            setEntitiesStatus({ ok: true, count: result.data.length, name: file.name });
          } else if (lowerName.includes("relat")) {
            relationsData = result.data;
            setRelationsStatus({ ok: true, count: result.data.length, name: file.name });
          } else {
            setEntitiesStatus({ ok: false, name: file.name, error: "Unknown CSV format" });
          }
        }
      } catch (err) {
        console.error("CSV parse error:", err);
      }
    }

    if (entitiesData && relationsData) {
      onDataLoaded(entitiesData, relationsData);
    }
  }, [onDataLoaded]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileInput = useCallback((e) => {
    processFiles(e.target.files);
  }, [processFiles]);

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("csv-file-input").click()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
          ${dragOver
            ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
            : "border-slate-700 hover:border-indigo-500/50 bg-slate-950/50 hover:bg-slate-950/80"
          }
        `}
      >
        <Upload className="w-10 h-10 mx-auto text-indigo-400 mb-3" />
        <p className="text-sm text-slate-200 font-semibold">
          Drop or Click to Upload CSV Files
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Select both <code className="text-indigo-300">entities.csv</code> and{" "}
          <code className="text-indigo-300">relationships.csv</code> together
        </p>
        <p className="text-[10px] text-slate-600 mt-2">
          Files are auto-detected by their headers
        </p>
        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Status Indicators */}
      {(entitiesStatus || relationsStatus) && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
          <StatusRow label="Entities" status={entitiesStatus} />
          <StatusRow label="Relationships" status={relationsStatus} />
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, status }) {
  if (!status) {
    return (
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          {label}
        </span>
        <span>Awaiting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-2 text-slate-300">
        <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
        {label}
      </span>
      {status.ok ? (
        <span className="flex items-center gap-1 text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {status.count} records ({status.name})
        </span>
      ) : (
        <span className="flex items-center gap-1 text-rose-400 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          {status.error}
        </span>
      )}
    </div>
  );
}
