// Default fallback entities (from entities.csv)
export const DEFAULT_ENTITIES = [];

// Default fallback relationships (from relationships.csv)
export const DEFAULT_RELATIONSHIPS = [];

// Relation type classification
export const FAMILY_RELATIONS = new Set(["PARENT", "CHILD", "SPOUSE", "PARTNER", "SIBLING"]);
export const SOCIAL_RELATIONS = new Set(["FRIEND", "COLLEAGUE", "NEIGHBOR", "MENTOR", "ACQUAINTANCE"]);

export const RELATION_COLORS = {
  PARENT: "#f43f5e",
  CHILD: "#f43f5e",
  SPOUSE: "#ec4899",
  PARTNER: "#ec4899",
  FRIEND: "#f59e0b",
  COLLEAGUE: "#38bdf8",
  SIBLING: "#34d399",
  NEIGHBOR: "#a78bfa",
  MENTOR: "#8b5cf6",
  DEFAULT: "#a78bfa",
};
