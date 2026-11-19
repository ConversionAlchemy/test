// Names for a settlement's streets, quarters, factions and buildings, in the voice of its culture: Azgaar's own
// Markov name chains over the culture's name base, plus the state and faith it belongs to

export interface NameBase {
  b: string; // names, comma-separated
  min: number;
  max: number;
  d: string; // letters allowed to double
}
/** What the region knows about a settlement, for naming it */
export interface Lore {
  base?: NameBase;
  state?: { n: string; full?: string; form?: string };
  religion?: { n: string; deity?: string };
  rival?: string; // a neighbouring state
  capital?: boolean;
  port?: boolean;
  neighbours?: string[];
}

const VOWEL = /[aeiouyáéíóúýàèìòùâêîôûäëïöüåæøœ]/i;
const isVowel = (c?: string) => !!c && VOWEL.test(c);

// Azgaar's chain: each pseudo-syllable keyed by the letter before it
function chainOf(list: string): Record<string, string[]> {
  const chain: Record<string, string[]> = {};
  for (const raw of list.split(",")) {
    const name = raw.trim().toLowerCase();
    if (!name) continue;
    const basic = !/[^\x20-\x7e]/.test(name);
    for (let i = -1, syl = ""; i < name.length; i += syl.length || 1, syl = "") {
      const prev = name[i] || "";
      let v = 0;
      for (let c = i + 1; name[c] && syl.length < 5; c++) {
        const that = name[c];
        const next = name[c + 1];
        syl += that;
        if (syl === " " || syl === "-") break;
        if (!next || next === " " || next === "-") break;
        if (isVowel(that)) v = 1;
        if (that === "y" && next === "e") continue;
        if (
          basic &&
          ((that === "o" && next === "o") ||
            (that === "e" && next === "e") ||
            (that === "a" && next === "e") ||
            (that === "c" && next === "h"))
        )
          continue;
        if (isVowel(that) === isVowel(next)) break;
        if (v && isVowel(name[c + 2])) break;
      }
      if (!chain[prev]) chain[prev] = [];
      chain[prev].push(syl);
    }
  }
  return chain;
}

const rngOf = (seed: number) => {
  let v = ((seed * 2654435761) >>> 0) % 2147483646 || 1;
  return () => {
    v = (v * 16807) % 2147483647;
    return v / 2147483647;
  };
};

const ENGLISH: NameBase = {
  b: "Ashford,Bramley,Calder,Dunmore,Elsworth,Fenwick,Garrow,Harlow,Kestle,Larkin,Marlow,Norbury,Oakham,Pelham,Radley,Selby,Thorne,Upton,Wareham,Yarrow,Brindle,Cotter,Hale,Tamsin,Wick",
  min: 4,
  max: 9,
  d: "lst"
};

const TRADES = [
  "Mint",
  "Tanner",
  "Cooper",
  "Chandler",
  "Smith",
  "Weaver",
  "Baker",
  "Brewer",
  "Salt",
  "Rope",
  "Wool",
  "Fish",
  "Corn",
  "Horse",
  "Bell",
  "Mill",
  "Well",
  "Church",
  "Silver",
  "Candle"
];
const STREET_END = ["Street", "Street", "Lane", "Row", "Way", "Walk"];
const ADJ = [
  "Gilded",
  "Brass",
  "Sleeping",
  "Crooked",
  "Golden",
  "Drowned",
  "Merry",
  "Black",
  "Red",
  "Wandering",
  "Silver",
  "Laughing",
  "Honest",
  "Weary",
  "Three"
];
const NOUN = [
  "Anchor",
  "Scale",
  "Clerk",
  "Lantern",
  "Goose",
  "Barrel",
  "Crown",
  "Stag",
  "Plough",
  "Key",
  "Boar",
  "Bell",
  "Hound",
  "Ferryman",
  "Feathers"
];
const CRAFT = [
  "Weavers",
  "Tanners",
  "Smiths",
  "Masons",
  "Coopers",
  "Chandlers",
  "Brewers",
  "Dyers",
  "Carpenters",
  "Potters"
];
const SEA = ["Dockers", "Shipwrights", "Fishmongers", "Ropemakers", "Sailmakers"];
const TRADE_HOUSE = [
  "Merchants' League",
  "Drapers' Company",
  "Weigh-Masters' Guild",
  "Vintners' Company",
  "Spice Traders' Guild"
];
const GANG = ["Crew", "Knives", "Rats", "Hand", "Boys", "Lanterns"];
const SLUM = ["The Warren", "The Rookery", "The Sinks", "The Mire", "The Hollows", "The Shambles"];

export function namer(lore: Lore | undefined, seed: number) {
  const R = rngOf(seed + 7);
  const pick = <T>(a: readonly T[]) => a[Math.floor(R() * a.length)];
  const base = lore?.base?.b ? lore.base : ENGLISH;
  const chain = chainOf(base.b);
  const used = new Set<string>();
  // one word from the culture's chain, Azgaar's way
  const word = (): string => {
    for (let tries = 0; tries < 12; tries++) {
      let v = chain[""] ?? [];
      let cur = v.length ? pick(v) : "";
      let w = "";
      for (let i = 0; i < 20; i++) {
        if (cur === "") {
          if (w.length < base.min) {
            w = "";
            v = chain[""] ?? [];
          } else break;
        } else {
          if (w.length + cur.length > base.max) {
            if (w.length < base.min) w += cur;
            break;
          }
          v = chain[cur[cur.length - 1]] || chain[""] || [];
        }
        w += cur;
        cur = v.length ? pick(v) : "";
      }
      w = w.replace(/['\- ]+$/, "");
      let out = "";
      for (const [i, c] of [...w].entries()) {
        if (c === w[i + 1] && !base.d.includes(c)) continue;
        out += !out.length || out.endsWith(" ") || out.endsWith("-") ? c.toUpperCase() : c;
      }
      out = out.split(" ")[0];
      if (out.length >= 3 && out.length <= 11 && !used.has(out)) {
        used.add(out);
        return out;
      }
    }
    return pick(base.b.split(",")).trim();
  };
  const short = () => {
    let w = word();
    for (let k = 0; k < 4 && w.length > 7; k++) w = word();
    return w;
  };

  const street = () => (R() < 0.45 ? `${pick(TRADES)} ${pick(STREET_END)}` : `${short()} ${pick(STREET_END)}`);
  const tavern = () => `The ${pick(ADJ)} ${pick(NOUN)}`;
  const craft = pick(CRAFT);
  const sea = lore?.port ? pick(SEA) : pick(CRAFT.filter(c => c !== craft));
  const house = pick(TRADE_HOUSE);
  const faith = lore?.religion;
  const god = faith?.deity?.split(",")[0]?.trim();

  return {
    word,
    street,
    tavern,
    district: (kind: string, k = 0): string => {
      const w = short();
      switch (kind) {
        case "centre":
          return pick(["Market Quarter", "The Exchange", "Old Market", `${w} Market`]);
        case "wealthy":
          return pick([`${w} Hill`, "The Heights", `${w} Rise`, `${w} Green`]);
        case "docks":
          return pick([`${w} Quay`, "Waterside", "The Strand", `${w} Wharf`]);
        case "shanty":
          return pick(SLUM);
        default:
          return k ? pick([`${w} End`, `${w}gate`, `${w} Cross`]) : pick(["Old Town", `${w}gate`, `Old ${w}`]);
      }
    },
    place: (kind: string): string => {
      const w = short();
      switch (kind) {
        case "square":
          return pick([`${w} Square`, "Market Square", `${w} Market`]);
        case "market":
          return pick(["Fish Market", "Corn Market", "Hay Market", "Horse Fair", "Cloth Market", "Butter Cross"]);
        case "park":
          return pick([`${w} Gardens`, `${w} Green`, `${w} Park`]);
        case "pond":
          return pick([`${w} Pond`, `${w} Pool`, `${w} Mere`]);
        case "yard":
          return pick([`${w} Yard`, `${w} Close`, `${w}'s Court`]);
        case "opening":
          return pick([`${w} Place`, `${w} Cross`, `${w} Plain`]);
        default:
          return `${w} Square`;
      }
    },
    hall: (burg: string, size: string) =>
      lore?.capital ? `${lore.state?.n ?? burg} Palace` : size === "city" ? `${burg} Guildhall` : `${burg} Moot Hall`,
    // a fort is named by its size: one cell a fort, two a castle, three or more a citadel
    keep: (cells: number) =>
      cells >= 3 ? "The Citadel" : cells === 2 ? `${short()} Castle` : pick([`${short()} Fort`, `Fort ${short()}`]),
    chapel: () => (god ? `Chapel of ${god}` : `St ${short()}'s Chapel`),
    temple: () => (god ? `Temple of ${god}` : faith ? `${faith.n} Temple` : `St ${short()}'s Church`),
    guild: [craft, sea, house] as const,
    factions: (burg: string, size: string) => {
      const st = lore?.state;
      const rulers = lore?.capital
        ? (st?.full ?? `Crown of ${st?.n ?? burg}`)
        : st?.form === "Republic"
          ? `${burg} Council`
          : st?.form === "Theocracy"
            ? `${faith?.n ?? "The"} Clergy`
            : `House ${short()}`;
      const law = size === "hamlet" || size === "village" ? "The Reeve's Men" : `${burg} Watch`;
      return [
        { id: 0, name: rulers, kind: "Rulers", col: "#c99a2e" },
        { id: 1, name: law, kind: "Law", col: "#b0453c" },
        { id: 2, name: `${craft}' Guild`, kind: "Guild", col: "#4a78ad" },
        { id: 3, name: `${sea}' Guild`, kind: "Guild", col: "#3a8a84" },
        { id: 4, name: house, kind: "Guild", col: "#c27536" },
        { id: 5, name: `The ${short()} ${pick(GANG)}`, kind: "Underworld", col: "#6d4a80" },
        { id: 6, name: lore?.rival ? `${lore.rival} Agents` : "Foreign Agents", kind: "Outsiders", col: "#2e3d66" }
      ];
    },
    notables: () => ({
      watch: "The Watch House",
      harbourWatch: "Harbour Watch",
      chapel: god ? `Shrine of ${god}` : `St ${short()}'s Chapel`,
      dockTavern: tavern(),
      tavern1: tavern(),
      tavern2: tavern(),
      guildHall: `Hall of the ${craft}`,
      harbourmaster: "Harbourmaster"
    })
  };
}
export type Namer = ReturnType<typeof namer>;
