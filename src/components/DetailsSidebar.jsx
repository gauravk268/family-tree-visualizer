import { X, Phone, MapPin, Briefcase, User, Hash, Heart, Users, ChevronRight, ChevronLeft } from "lucide-react";

export default function DetailsSidebar({
  entity,
  spouse,
  relationships,
  entities,
  onClose,
  isCollapsed,
  onToggleCollapse,
}) {
  if (isCollapsed) {
    return (
      <aside className="w-12 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 flex flex-col items-center py-4 shrink-0 justify-between">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
          title="Expand Panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="[writing-mode:vertical-lr] text-xs font-semibold tracking-wider uppercase text-slate-500 select-none flex items-center gap-2">
          <User className="w-3.5 h-3.5 rotate-90" />
          <span>Entity Details</span>
        </div>
        <div className="w-2" />
      </aside>
    );
  }

  if (!entity) {
    return (
      <aside className="w-72 xl:w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            Entity Details
          </span>
          <button
            onClick={onToggleCollapse}
            className="p-1 text-slate-400 hover:text-slate-200 rounded transition"
            title="Collapse Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 space-y-3">
          <User className="w-12 h-12 mx-auto text-slate-700" />
          <p className="text-xs text-slate-500">
            Click any node in the tree to view details
          </p>
        </div>
      </aside>
    );
  }

  const entityMap = new Map(entities.map((e) => [String(e.id), e]));
  const eid = String(entity.id);

  // All direct relationships for this entity
  const directLinks = relationships.filter(
    (r) => String(r.source_id) === eid || String(r.target_id) === eid
  );

  const genderIcon = entity.gender === "female" ? "♀" : entity.gender === "male" ? "♂" : "⚧";
  const genderColor = entity.gender === "female" ? "text-pink-400" : entity.gender === "male" ? "text-blue-400" : "text-slate-400";

  return (
    <aside className="w-72 xl:w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 flex flex-col shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <User className="w-3.5 h-3.5" />
          Entity Details
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleCollapse}
            className="p-1 text-slate-500 hover:text-slate-300 rounded transition"
            title="Collapse Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-300 rounded transition"
            title="Deselect"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Avatar + Name */}
        <div className="text-center">
          <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold border-2 ${
            entity.gender === "female"
              ? "bg-pink-500/15 border-pink-500/40 text-pink-400"
              : "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
          }`}>
            {entity.name?.substring(0, 2).toUpperCase() || "??"}
          </div>
          <h2 className="font-bold text-base text-white">{entity.name}</h2>
          <span className={`text-sm ${genderColor} font-medium`}>{genderIcon}</span>
          {entity.occupation && (
            <p className="text-[11px] text-slate-400 mt-1 bg-slate-800/80 inline-block px-2 py-0.5 rounded-full">
              {entity.occupation}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-2.5 text-xs">
          <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="ID" value={`#${entity.id}`} />
          <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={entity.contact_number || "—"} />
          <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="City" value={entity.city || "—"} />
          <InfoRow icon={<Briefcase className="w-3.5 h-3.5" />} label="Occupation" value={entity.occupation || "—"} />
          {entity.birth_date && (
            <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Born" value={entity.birth_date} />
          )}
        </div>

        {/* Spouse Info */}
        {spouse && (
          <div className="bg-pink-500/5 border border-pink-500/20 rounded-lg p-3">
            <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Heart className="w-3 h-3" />
              Spouse / Partner
            </p>
            <p className="text-sm text-white font-semibold">{spouse.name}</p>
            {spouse.occupation && (
              <p className="text-[11px] text-slate-400 mt-0.5">{spouse.occupation}</p>
            )}
            {spouse.contact_number && (
              <p className="text-[11px] text-slate-500 mt-0.5">{spouse.contact_number}</p>
            )}
          </div>
        )}

        {/* Connections */}
        <div className="border-t border-slate-800 pt-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Users className="w-3 h-3" />
            Direct Connections ({directLinks.length})
          </p>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {directLinks.map((r, i) => {
              const isSource = String(r.source_id) === eid;
              const otherId = isSource ? String(r.target_id) : String(r.source_id);
              const other = entityMap.get(otherId);
              return (
                <div
                  key={i}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <RelationBadge relation={r.relation} />
                    <span className="text-slate-300">
                      {isSource ? "→" : "←"} {other?.name || otherId}
                    </span>
                  </div>
                </div>
              );
            })}
            {directLinks.length === 0 && (
              <p className="text-slate-600 text-[11px]">No connections found.</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 text-slate-300">
      <span className="text-slate-500">{icon}</span>
      <span className="text-slate-500 w-16 shrink-0">{label}</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}

function RelationBadge({ relation }) {
  const colors = {
    PARENT: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    SPOUSE: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    PARTNER: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    FRIEND: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    COLLEAGUE: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    SIBLING: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  const cls = colors[(relation || "").toUpperCase()] || "bg-purple-500/20 text-purple-400 border-purple-500/30";

  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${cls}`}>
      {(relation || "?").toUpperCase()}
    </span>
  );
}
