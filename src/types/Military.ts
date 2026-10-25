export type MilitaryUnit = {
  icon: string;
  name: string;
  rural: number;
  urban: number;
  crew: number;
  power: number;
  type: string;
  separate: number;
  fl?: string; // Fluoria kit unit id
  slot?: number; // troops per slot
  move?: number; // cells per move off road
  range?: number; // airships: cells from a friendly settlement
  biomes?: number[];
  states?: number[];
  cultures?: number[];
  religions?: number[];
};
