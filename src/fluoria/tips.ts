// What Azgaar's map tooltip says over a unit or a settlement, as Fluoria tells it (the editor fills these in)
let unitLine: ((el: Element) => string | null) | null = null;
let settlementLine: ((burg: number) => string) | null = null;

export function setTips(unit: (el: Element) => string | null, settlement: (burg: number) => string): void {
  unitLine = unit;
  settlementLine = settlement;
}

export const unitTipFor = (el: Element) => unitLine?.(el) ?? null;
export const settlementTipFor = (burg: number) => settlementLine?.(burg) ?? "";
