import { Filter, SlidersHorizontal, Focus, UploadCloud, RotateCcw, Route } from "lucide-react";

export default function ControlPanel({
  entities,
  rootId,
  onRootChange,
  onResetRoot,
  filterMode,
  onFilterChange,
  nodeGap,
  onGapChange,
  onUploadClick,
  onResetData,
  lineageSource,
  lineageTarget,
  onSourceChange,
  onTargetChange,
  onFindLineage,
  onClearLineage,
  lineageResult,
}) {
  return (
    <aside className="w-72 xl:w-80 bg-slate-900/95 backdrop-blur-md border-r border-slate-800 flex flex-col overflow-y-auto shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600/20 text-indigo-400 p-1.5 rounded-lg border border-indigo-500/30">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Controls
          </span>
        </div>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* CSV Upload Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onUploadClick}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold py-2.5 px-3 rounded-lg border border-indigo-500/30 transition"
          >
            <UploadCloud className="w-4 h-4" />
            Import CSVs
          </button>
          <button
            onClick={onResetData}
            className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium py-2.5 px-3 rounded-lg border border-slate-700 transition"
            title="Reset to sample data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Root Entity Selector with Reset / View All */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Focus className="w-3.5 h-3.5 text-indigo-400" />
              Focus Root
            </label>
            {rootId && (
              <button
                onClick={onResetRoot}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
                title="Remove Root focus and display all vertices"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Show All</span>
              </button>
            )}
          </div>
          <select
            value={rootId || ""}
            onChange={(e) => onRootChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
          >
            <option value="">🌐 None (Show All Vertices & In-Laws)</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} (#{e.id})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500">
            {rootId
              ? `Anchored on #${rootId}. Displaying only this family tree.`
              : "Showing all family lineages & vertices without root restriction."}
          </p>
        </div>

        {/* Relationship Filter */}
        <div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <Filter className="w-3.5 h-3.5" />
            Relationship Filter
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { value: "all", label: "All Relations", desc: "Family + Social" },
              { value: "family", label: "Family Only", desc: "Parent, Spouse, Sibling" },
              { value: "social", label: "Social Only", desc: "Friend, Colleague" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => onFilterChange(opt.value)}
                className={`text-left px-3 py-2 rounded-lg text-xs font-medium border transition ${
                  filterMode === opt.value
                    ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                    : "bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:text-slate-300"
                }`}
              >
                <span className="block font-semibold">{opt.label}</span>
                <span className="block text-[10px] opacity-60 mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Node Spacing Slider */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-400">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Node Gap
            </span>
            <span className="text-slate-400 font-mono">{nodeGap}px</span>
          </div>
          <input
            type="range"
            min="20"
            max="120"
            value={nodeGap}
            onChange={(e) => onGapChange(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Compact</span>
            <span>Spacious</span>
          </div>
        </div>

        {/* Lineage Finder */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <Route className="w-3.5 h-3.5" />
              Lineage Finder
            </label>
            {(lineageSource || lineageTarget || lineageResult) && (
              <button
                onClick={onClearLineage}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <span className="block text-[10px] text-slate-500 font-medium mb-1">Person A</span>
              <select
                value={lineageSource}
                onChange={(e) => onSourceChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
              >
                <option value="">-- Select Person A --</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} (#{e.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-[10px] text-slate-500 font-medium mb-1">Person B</span>
              <select
                value={lineageTarget}
                onChange={(e) => onTargetChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
              >
                <option value="">-- Select Person B --</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} (#{e.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onFindLineage}
                disabled={!lineageSource || !lineageTarget}
                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 disabled:opacity-40 text-indigo-200 border border-indigo-500/40 font-semibold py-1.5 rounded-lg text-xs transition"
              >
                <Route className="w-3.5 h-3.5" />
                Trace Lineage
              </button>
              {(lineageSource || lineageTarget || lineageResult) && (
                <button
                  onClick={onClearLineage}
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition flex items-center gap-1"
                  title="Reset Lineage Finder"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Lineage Output Display */}
          {lineageResult && (
            <div className="mt-2 pt-2 border-t border-slate-800/80">
              {lineageResult.found ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-semibold">Lineage Connected</span>
                    <span className="text-slate-500 text-[10px]">{lineageResult.path.length - 1} step(s)</span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {lineageResult.path.map((step, idx) => {
                      const person = entities.find((e) => String(e.id) === String(step.id));
                      return (
                        <div key={idx} className="flex flex-col">
                          {idx > 0 && (
                            <div className="flex items-center gap-1.5 py-0.5 px-2 text-[10px] text-indigo-400 font-medium">
                              <span className="text-slate-600">↓</span>
                              <span className="bg-indigo-950/70 border border-indigo-800/50 px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wide">
                                {step.relation || "CONNECTED"}
                              </span>
                            </div>
                          )}
                          <div className={`px-2 py-1 rounded text-xs border flex items-center justify-between ${
                            idx === 0 || idx === lineageResult.path.length - 1
                              ? "bg-indigo-900/40 border-indigo-500/50 text-indigo-200 font-semibold"
                              : "bg-slate-900 border-slate-800 text-slate-300"
                          }`}>
                            <span>{person?.name || `ID #${step.id}`}</span>
                            <span className="text-[9px] text-slate-500">#{step.id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-rose-400">
                  No lineage or connection path found between the selected people.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Edge Legend
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-rose-500 rounded-full inline-block" />
              Parent
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-pink-400 rounded-full inline-block" />
              Spouse
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-pink-400 border-b border-dashed border-white inline-block" />
              In-Law Lineage
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-amber-400 rounded-full inline-block" />
              Friend
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-sky-400 rounded-full inline-block" />
              Colleague
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-emerald-400 rounded-full inline-block" />
              Sibling
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-yellow-400 rounded-full inline-block" />
              Traced Path
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
