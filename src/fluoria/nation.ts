// The nation in focus and how every other nation stands to it. Import-free of the map so the panel, the tooltip and
// the pixel map can all read it. Diplomacy stays Azgaar's data, kept to what changes play
import { playableRelation } from "@/data/diplomacy";

export type Standing = "self" | "ally" | "enemy" | "vassal" | "overlord" | "neutral";

let focus = 0;
const listeners = new Set<(state: number) => void>();

export const focusedNation = (): number => focus;

/** Put a nation in focus (0 for none): the map dims the rest and tints them by how they stand to it */
export function setFocus(state: number): void {
  if (state === focus) return;
  focus = state;
  for (const listener of listeners) listener(focus);
}

export function onFocus(listener: (state: number) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** How `other` stands to `state`, read from the other's own diplomacy towards it */
export function standing(state: number, other: number): Standing {
  if (other === state) return "self";
  const relation = playableRelation(pack.states[other]?.diplomacy?.[state] ?? "Neutral");
  if (relation === "Ally") return "ally";
  if (relation === "Enemy") return "enemy";
  if (relation === "Vassal") return "vassal"; // the other is this state's vassal
  if (relation === "Suzerain") return "overlord";
  return "neutral";
}

export const STANDING_LABEL: Record<Standing, string> = {
  self: "",
  ally: "ally",
  enemy: "enemy",
  vassal: "vassal",
  overlord: "overlord",
  neutral: "neutral"
};

/**
 * Azgaar's moods (friendly, suspicious, rival, unknown) become neutral, both ways, so every map plays with the same
 * five relations. Returns how many pairs changed
 */
export function simplifyDiplomacy(): number {
  let changed = 0;
  for (const state of pack.states ?? []) {
    if (!state?.i || state.removed || !state.diplomacy) continue;
    state.diplomacy.forEach((relation, other) => {
      const next = playableRelation(relation);
      if (next === relation || !state.diplomacy) return;
      state.diplomacy[other] = next;
      changed++;
    });
  }
  return changed;
}
