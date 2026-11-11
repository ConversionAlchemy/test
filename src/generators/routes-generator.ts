import Alea from "alea";
import { curveCatmullRom, line, quadtree } from "d3";
import Delaunator from "delaunator";
import { replaceWholeWord } from "@/utils/languageUtils";
import { requireName, requireOneOf } from "@/utils/validationUtils";
import { distanceSquared, findPath, getAdjective, isLand, ra, rn, round, rw } from "../utils";
import { meander } from "../utils/pathUtils";
import type { Burg } from "./burgs-generator";
import type { Label } from "./labels-generator";
import type { River } from "./river-generator";
import { Tags } from "./tags";
import type { Point } from "./voronoi";

const ROUTES_SHARP_ANGLE = 135;
const ROUTES_VERY_SHARP_ANGLE = 115;

export const MIN_PASSABLE_SEA_TEMP = -4;
const ROUTE_REUSE_MODIFIER = 0.3; // a new land route would rather follow an existing one than run beside it
const REDUNDANT_DETOUR = 1.35; // a trail is dropped when the network already links its ends within this detour
const RELAX_PASSES = 4;
const RIVER_TYPE_MODIFIER = 1.5;
const ROUTE_TYPE_MODIFIERS: Record<string, number> = {
  "-1": 1, // coastline
  "-2": 1.8, // sea
  "-3": 4, // open sea
  "-4": 6, // ocean
  default: 8 // far ocean
};

export const UNNAMED_ROUTE = "Unnamed route segment";

// name generator data
const models: Record<string, Record<string, number>> = {
  roads: {
    burg_suffix: 3,
    prefix_suffix: 6,
    the_descriptor_prefix_suffix: 2,
    the_descriptor_burg_suffix: 1
  },
  trails: { burg_suffix: 8, prefix_suffix: 1, the_descriptor_burg_suffix: 1 },
  searoutes: {
    burg_suffix: 4,
    prefix_suffix: 2,
    the_descriptor_prefix_suffix: 1
  }
};

const prefixes: string[] = [
  "King",
  "Queen",
  "Military",
  "Old",
  "New",
  "Ancient",
  "Royal",
  "Imperial",
  "Great",
  "Grand",
  "High",
  "Silver",
  "Dragon",
  "Shadow",
  "Star",
  "Mystic",
  "Whisper",
  "Eagle",
  "Golden",
  "Crystal",
  "Enchanted",
  "Frost",
  "Moon",
  "Sun",
  "Thunder",
  "Phoenix",
  "Sapphire",
  "Celestial",
  "Wandering",
  "Echo",
  "Twilight",
  "Crimson",
  "Serpent",
  "Iron",
  "Forest",
  "Flower",
  "Whispering",
  "Eternal",
  "Frozen",
  "Rain",
  "Luminous",
  "Stardust",
  "Arcane",
  "Glimmering",
  "Jade",
  "Ember",
  "Azure",
  "Gilded",
  "Divine",
  "Shadowed",
  "Cursed",
  "Moonlit",
  "Sable",
  "Everlasting",
  "Amber",
  "Nightshade",
  "Wraith",
  "Scarlet",
  "Platinum",
  "Whirlwind",
  "Obsidian",
  "Ethereal",
  "Ghost",
  "Spike",
  "Dusk",
  "Raven",
  "Spectral",
  "Burning",
  "Verdant",
  "Copper",
  "Velvet",
  "Falcon",
  "Enigma",
  "Glowing",
  "Silvered",
  "Molten",
  "Radiant",
  "Astral",
  "Wild",
  "Flame",
  "Amethyst",
  "Aurora",
  "Shadowy",
  "Solar",
  "Lunar",
  "Whisperwind",
  "Fading",
  "Titan",
  "Dawn",
  "Crystalline",
  "Jeweled",
  "Sylvan",
  "Twisted",
  "Ebon",
  "Thorn",
  "Cerulean",
  "Halcyon",
  "Infernal",
  "Storm",
  "Eldritch",
  "Sapphire",
  "Crimson",
  "Tranquil",
  "Paved"
];

const descriptors = [
  "Great",
  "Shrouded",
  "Sacred",
  "Fabled",
  "Frosty",
  "Winding",
  "Echoing",
  "Serpentine",
  "Breezy",
  "Misty",
  "Rustic",
  "Silent",
  "Cobbled",
  "Cracked",
  "Shaky",
  "Obscure"
];

const suffixes: Record<string, Record<string, number>> = {
  roads: { road: 7, route: 3, way: 2, highway: 1 },
  trails: { trail: 4, path: 1, track: 1, pass: 1 },
  searoutes: { route: 5, lane: 2, passage: 1, "water way": 1 }
};

export interface Route {
  i: number;
  name?: string;
  group: string;
  feature: number;
  points: number[][]; // [x, y, cellId]. TODO: type properly
  cells?: number[];
  merged?: boolean;
  length?: number;
  lock?: boolean;
  label?: Label;
  note?: string;
  tags?: string[];
}

type RiverEdge = { riverId: number; fromIndex: number };

type RiverRun = {
  startIdx: number; // first route-cell index of the run
  endIdx: number; // last route-cell index of the run (shared with the next run at confluences)
  riverId: number;
  direction: 1 | -1; // +1 if the route runs downstream (source->mouth), -1 if upstream
  firstCanonicalIndexInRiver: number; // river.cells index of the run's source-most cell
};

class RoutesModule {
  private connections: Map<string, boolean> = new Map();
  private adjacency: Map<number, Set<number>> = new Map();
  private riverEdges: Map<number, Map<number, RiverEdge>> = new Map();
  private riversById: Map<number, River> = new Map();
  private riverGeometryCache: Map<number, { points: Point[]; anchorIndices: number[] }> = new Map();

  /** Rename a route */
  rename(routeId: number, name: string): void {
    const route = pack.routes.find(({ i }) => i === routeId);
    if (!route) throw new Error(`Route ${routeId} does not exist`);
    const old = route.name;
    route.name = requireName(name);
    if (route.label?.text)
      route.label.text = replaceWholeWord(route.label.text, old ?? "", route.name) ?? route.label.text;
  }

  regenerate(): void {
    const lockedRoutes = pack.routes.filter(route => route.lock).map((route, index) => ({ ...route, i: index }));
    this.generate(lockedRoutes, Math.random());
  }

  generate(lockedRoutes: Route[] = [], randomSeed?: number) {
    Math.random = Alea(randomSeed ?? options.map.seed);
    this.connections = new Map();
    this.adjacency = new Map();
    this.buildRiverEdges();
    lockedRoutes.forEach((route: Route) => {
      this.addConnections(route.points.map(p => p[2]));
    });

    pack.routes = this.createRoutesData(lockedRoutes);
    pack.cells.routes = this.buildLinks(pack.routes);
  }

  private sortBurgsByFeature(burgs: Burg[]) {
    const burgsByFeature: Record<number, Burg[]> = {};
    const capitalsByFeature: Record<number, Burg[]> = {};
    const portsByFeature: Record<number, Burg[]> = {};

    const addBurg = (collection: Record<number, Burg[]>, feature: number, burg: Burg) => {
      if (!collection[feature]) collection[feature] = [];
      collection[feature].push(burg);
    };

    for (const burg of burgs) {
      if (burg.i && !burg.removed) {
        const { feature, capital, port } = burg;
        if (feature === undefined) continue;
        addBurg(burgsByFeature, feature, burg);
        if (capital) addBurg(capitalsByFeature, feature, burg);
        if (port) addBurg(portsByFeature, port, burg);
      }
    }

    return { burgsByFeature, capitalsByFeature, portsByFeature };
  }

  // Urquhart graph is obtained by removing the longest edge from each triangle in the Delaunay triangulation
  // this gives us an aproximation of a desired road network, i.e. connections between burgs
  // code from https://observablehq.com/@mbostock/urquhart-graph
  private calculateUrquhartEdges(points: Point[]) {
    if (points.length < 2) return []; // No connection for less than 2 points
    if (points.length === 2) return [[0, 1]]; // Direct connection for exactly two points

    const score = (p0: number, p1: number) => distanceSquared(points[p0], points[p1]);

    const { halfedges, triangles } = Delaunator.from(points);
    const n = triangles.length;

    const removed = new Uint8Array(n);
    const edges = [];

    for (let e = 0; e < n; e += 3) {
      const p0 = triangles[e],
        p1 = triangles[e + 1],
        p2 = triangles[e + 2];

      const p01 = score(p0, p1),
        p12 = score(p1, p2),
        p20 = score(p2, p0);

      removed[
        p20 > p01 && p20 > p12
          ? Math.max(e + 2, halfedges[e + 2])
          : p12 > p01 && p12 > p20
            ? Math.max(e + 1, halfedges[e + 1])
            : Math.max(e, halfedges[e])
      ] = 1;
    }

    for (let e = 0; e < n; ++e) {
      if (e > halfedges[e] && !removed[e]) {
        const t0 = triangles[e];
        const t1 = triangles[e % 3 === 2 ? e - 2 : e + 1];
        edges.push([t0, t1]);
      }
    }

    return edges;
  }

  getLandPathCost(current: number, next: number) {
    if (pack.cells.h[next] < 20) return Infinity; // ignore water cells

    const habitability = pack.biomes[pack.cells.biome[next]].habitability;
    if (!habitability) return Infinity; // inhabitable cells are not passable (e.g. glacier)

    const distanceCost = distanceSquared(pack.cells.p[current], pack.cells.p[next]);
    const habitabilityModifier = 1 + Math.max(100 - habitability, 0) / 1000; // [1, 1.1];
    const heightModifier = 1 + Math.max(pack.cells.h[next] - 25, 25) / 25; // [1, 3];
    const connectionModifier = this.connections.has(`${current}-${next}`) ? ROUTE_REUSE_MODIFIER : 1;
    const burgModifier = pack.cells.burg[next] ? 1 : 3;

    const pathCost = distanceCost * habitabilityModifier * heightModifier * connectionModifier * burgModifier;
    return pathCost;
  }

  getWaterPathCost(current: number, next: number) {
    const { h, r, p, t, g } = pack.cells;
    const connectionModifier = this.connections.has(`${current}-${next}`) ? 0.5 : 1;

    if (h[next] >= 20) {
      // land cell: only navigable via a river, and only along the actual river course
      if (!Rivers.isNavigable(next)) return Infinity;
      if (!this.riverEdges.get(current)?.has(next)) return Infinity;
      return distanceSquared(p[current], p[next]) * RIVER_TYPE_MODIFIER * connectionModifier;
    }

    // leaving a land cell into water
    if (h[current] >= 20) {
      if (r[current]) {
        // river-land cell: must follow the river's recorded outlet
        if (!this.riverEdges.get(current)?.has(next)) return Infinity;
      } else {
        // coastal port cell: must leave through its haven, the water cell the burg was shifted
        // towards — otherwise the rendered route cuts across the land to reach the burg
        const haven = pack.cells.haven?.[current];
        if (haven && haven !== next) return Infinity;
      }
    }
    if (grid.cells.temp[g[next]] < MIN_PASSABLE_SEA_TEMP) return Infinity;

    const distanceCost = distanceSquared(p[current], p[next]);
    const typeModifier = ROUTE_TYPE_MODIFIERS[t[next]] || ROUTE_TYPE_MODIFIERS.default;
    return distanceCost * typeModifier * connectionModifier;
  }

  private createCostEvaluator({ isWater }: { isWater: boolean }) {
    return isWater ? this.getWaterPathCost.bind(this) : this.getLandPathCost.bind(this);
  }

  private getRouteSegments(pathCells: number[]) {
    const segments = [];
    let segment = [];

    for (let i = 0; i < pathCells.length; i++) {
      const cellId = pathCells[i];
      const nextCellId = pathCells[i + 1];
      const isConnected =
        this.connections.has(`${cellId}-${nextCellId}`) || this.connections.has(`${nextCellId}-${cellId}`);

      if (isConnected) {
        if (segment.length) {
          // segment stepped into existing segment
          segment.push(pathCells[i]);
          segments.push(segment);
          segment = [];
        }
        continue;
      }

      segment.push(pathCells[i]);
    }

    if (segment.length > 1) segments.push(segment);

    return segments;
  }

  /** A water route may only reach its destination cell from a legitimate approach */
  private createWaterExitCheck(exit: number) {
    return (next: number, current?: number) => {
      if (next !== exit) return false;
      if (current === undefined) return true;
      // river port: approach along the river course
      if (this.riverEdges.get(current)?.has(next)) return true;
      // coastal port: approach only over water, through the haven the burg was shifted towards
      if (pack.cells.h[current] >= 20) return false;
      const haven = pack.cells.haven?.[exit];
      return !haven || current === haven;
    };
  }

  private findPathSegments({ isWater, start, exit }: { isWater: boolean; start: number; exit: number }) {
    const getCost = this.createCostEvaluator({ isWater });
    const isExit = isWater ? this.createWaterExitCheck(exit) : (next: number) => next === exit;
    const pathCells = findPath(start, isExit, getCost, pack);
    if (!pathCells) return [];
    const segments = this.getRouteSegments(pathCells);
    return segments;
  }

  /**
   * Cell chain of a sea route between two cells, or null if they are not connected by water.
   * Follows the same rules as generated searoutes: ports are left and entered through their
   * haven, navigable rivers are passable, colder seas are not, and existing routes are cheap.
   */
  findWaterPath(start: number, exit: number): number[] | null {
    return findPath(start, this.createWaterExitCheck(exit), this.getWaterPathCost.bind(this), pack);
  }

  /** Sea route geometry for a cell chain: burg positions at ports, meandering along river runs */
  getWaterPoints(cells: number[]): [number, number, number][] {
    // only the chain's own cells are read, so this skips preparePointsArray's whole-map allocation
    return this.addMeandering(
      cells,
      cells.map(cellId => this.getCellAnchor(cellId))
    );
  }

  private generateMainRoads() {
    TIME && console.time("generateMainRoads");
    const { capitalsByFeature } = this.sortBurgsByFeature(pack.burgs);
    const mainRoads: Route[] = [];

    for (const [key, featureCapitals] of Object.entries(capitalsByFeature)) {
      const points = featureCapitals.map(burg => [burg.x, burg.y] as Point);
      const urquhartEdges = this.calculateUrquhartEdges(points);
      urquhartEdges.forEach(([fromId, toId]) => {
        const start = featureCapitals[fromId].cell;
        const exit = featureCapitals[toId].cell;

        const segments = this.findPathSegments({ isWater: false, start, exit });
        for (const segment of segments) {
          this.addConnections(segment);
          mainRoads.push({ feature: Number(key), cells: segment } as Route);
        }
      });
    }

    TIME && console.timeEnd("generateMainRoads");
    return mainRoads;
  }

  private addConnections(segment: number[]) {
    for (let i = 0; i < segment.length - 1; i++) this.linkCells(segment[i], segment[i + 1]);
  }

  private linkCells(a: number, b: number) {
    if (a === b) return;
    this.connections.set(`${a}-${b}`, true);
    this.connections.set(`${b}-${a}`, true);
    if (!this.adjacency.has(a)) this.adjacency.set(a, new Set());
    if (!this.adjacency.has(b)) this.adjacency.set(b, new Set());
    this.adjacency.get(a)!.add(b);
    this.adjacency.get(b)!.add(a);
  }

  private pathLength(cells: number[]) {
    const { p } = pack.cells;
    let length = 0;
    for (let i = 1; i < cells.length; i++)
      length += Math.hypot(p[cells[i]][0] - p[cells[i - 1]][0], p[cells[i]][1] - p[cells[i - 1]][1]);
    return length;
  }

  /** Distances over the existing network from a cell, up to a limit */
  private networkDistances(start: number, limit: number) {
    const { p } = pack.cells;
    const dist = new Map<number, number>([[start, 0]]);
    const queue = new window.FlatQueue();
    queue.push(start, 0);
    while (queue.length) {
      const d = queue.peekValue();
      const current = queue.pop();
      if (d > (dist.get(current) ?? Infinity)) continue;
      for (const next of this.adjacency.get(current) ?? []) {
        if (pack.cells.h[next] < 20) continue; // a sea lane does not stand in for a land route
        const nd = d + Math.hypot(p[next][0] - p[current][0], p[next][1] - p[current][1]);
        if (nd > limit || nd >= (dist.get(next) ?? Infinity)) continue;
        dist.set(next, nd);
        queue.push(next, nd);
      }
    }
    return dist;
  }

  /** A new segment adds nothing when the network already links its ends, and every burg on it, by a short detour */
  private isRedundant(segment: number[]) {
    if (segment.length < 2) return true;
    const start = segment[0];
    const end = segment.at(-1)!;
    if (!this.adjacency.has(start) || !this.adjacency.has(end)) return false;
    const limit = this.pathLength(segment) * REDUNDANT_DETOUR;
    const dist = this.networkDistances(start, limit);
    if (!dist.has(end)) return false;
    return segment.every(cellId => !pack.cells.burg[cellId] || dist.has(cellId));
  }

  private generateTrails() {
    TIME && console.time("generateTrails");
    const { burgsByFeature } = this.sortBurgsByFeature(pack.burgs);
    const trails: Route[] = [];

    for (const [key, featureBurgs] of Object.entries(burgsByFeature)) {
      const points = featureBurgs.map(burg => [burg.x, burg.y] as Point);
      const urquhartEdges = this.calculateUrquhartEdges(points).sort(
        (a, b) => distanceSquared(points[a[0]], points[a[1]]) - distanceSquared(points[b[0]], points[b[1]])
      );
      urquhartEdges.forEach(([fromId, toId]) => {
        const start = featureBurgs[fromId].cell;
        const exit = featureBurgs[toId].cell;

        const segments = this.findPathSegments({ isWater: false, start, exit });
        for (const segment of segments) {
          if (this.isRedundant(segment)) continue;
          this.addConnections(segment);
          trails.push({ feature: Number(key), cells: segment } as Route);
        }
      });
    }

    TIME && console.timeEnd("generateTrails");
    return trails;
  }

  private generateSeaRoutes() {
    TIME && console.time("generateSeaRoutes");
    const { portsByFeature } = this.sortBurgsByFeature(pack.burgs);
    const seaRoutes: Route[] = [];

    for (const [featureId, featurePorts] of Object.entries(portsByFeature)) {
      const points = featurePorts.map(burg => [burg.x, burg.y] as Point);
      const urquhartEdges = this.calculateUrquhartEdges(points);

      urquhartEdges.forEach(([fromId, toId]) => {
        const start = featurePorts[fromId].cell;
        const exit = featurePorts[toId].cell;
        const segments = this.findPathSegments({ isWater: true, start, exit });
        for (const segment of segments) {
          this.addConnections(segment);
          seaRoutes.push({ feature: Number(featureId), cells: segment } as Route);
        }
      });
    }

    TIME && console.timeEnd("generateSeaRoutes");
    return seaRoutes;
  }

  private preparePointsArray(): Point[] {
    return pack.cells.p.map((_point, cellId) => this.getCellAnchor(cellId));
  }

  /** The point a route passes through in a cell: the burg's position at a port, the cell centre otherwise */
  private getCellAnchor(cellId: number): Point {
    const { cells, burgs } = pack;
    const burgId = cells.burg[cellId];
    if (burgId) return [burgs[burgId].x, burgs[burgId].y];
    const [x, y] = cells.p[cellId];
    return [x, y];
  }

  // Group consecutive route cells that follow a single river in one direction into maximal runs.
  // A run ends at a confluence (riverId change) or when the route leaves the river course; the
  // confluence cell is shared as the last cell of one run and the first of the next.
  private findRiverRuns(cells: number[]): RiverRun[] {
    const runs: RiverRun[] = [];

    let k = 0;
    while (k < cells.length - 1) {
      const edge = this.riverEdges.get(cells[k])?.get(cells[k + 1]);
      const reverseEdge = edge ? this.riverEdges.get(cells[k + 1])?.get(cells[k]) : undefined;
      if (!edge || !reverseEdge) {
        k++;
        continue;
      }

      const direction: 1 | -1 = reverseEdge.fromIndex === edge.fromIndex + 1 ? 1 : -1;
      const { riverId } = edge;
      let endIdx = k + 1;
      let prevToIndex = reverseEdge.fromIndex;

      // Extend the run while each step stays on the same river, contiguous and same-direction.
      while (endIdx + 1 < cells.length) {
        const ahead = this.riverEdges.get(cells[endIdx])?.get(cells[endIdx + 1]);
        if (!ahead || ahead.riverId !== riverId || ahead.fromIndex !== prevToIndex) break;
        const aheadReverse = this.riverEdges.get(cells[endIdx + 1])?.get(cells[endIdx]);
        if (!aheadReverse || aheadReverse.fromIndex - ahead.fromIndex !== direction) break;
        prevToIndex = aheadReverse.fromIndex;
        endIdx++;
      }

      const firstCanonicalIndexInRiver = direction === 1 ? edge.fromIndex : prevToIndex;
      runs.push({ startIdx: k, endIdx, riverId, direction, firstCanonicalIndexInRiver });
      k = endIdx;
    }

    return runs;
  }

  private getRiverGeometry(river: River): { points: Point[]; anchorIndices: number[] } {
    const cached = this.riverGeometryCache.get(river.i);
    if (cached) return cached;

    const { h, p } = pack.cells;
    const geometry = meander(river.cells, p, {
      anchors: river.points ?? undefined,
      meandering: 0.5,
      startStep: h[river.cells[0]] < 20 ? 1 : 10,
      isWaterCell: river.cells.map(c => c !== -1 && h[c] < 20),
      bounds: { width: options.map.graph.width, height: options.map.graph.height }
    });

    this.riverGeometryCache.set(river.i, geometry);
    return geometry;
  }

  private emitRiverRun(run: RiverRun, cells: number[], result: [number, number, number][]): void {
    const runCells = cells.slice(run.startIdx, run.endIdx + 1);
    const river = this.riversById.get(run.riverId);
    if (!river) return;

    const { points, anchorIndices } = this.getRiverGeometry(river);

    const lo = run.firstCanonicalIndexInRiver;
    const hi = lo + runCells.length - 1;
    const startPoint = anchorIndices[lo];
    const endPoint = anchorIndices[hi];
    let slicePoints: Point[] = points.slice(startPoint, endPoint + 1).map(point => [point[0], point[1]]);
    let sliceAnchorIndices = anchorIndices.slice(lo, hi + 1).map(idx => idx - startPoint);

    // Reverse for upstream routes so the output runs in route order.
    if (run.direction === -1) {
      const total = slicePoints.length;
      slicePoints = slicePoints.slice().reverse();
      sliceAnchorIndices = sliceAnchorIndices
        .slice()
        .reverse()
        .map(idx => total - 1 - idx);
    }

    let nextAnchorPtr = 0;
    let currentCellId = runCells[0];
    const skipFirst = result.length > 0 && result[result.length - 1][2] === runCells[0];
    for (let pk = 0; pk < slicePoints.length; pk++) {
      if (nextAnchorPtr < sliceAnchorIndices.length && sliceAnchorIndices[nextAnchorPtr] === pk) {
        currentCellId = runCells[nextAnchorPtr];
        nextAnchorPtr++;
      }
      if (pk === 0 && skipFirst) continue;
      result.push([slicePoints[pk][0], slicePoints[pk][1], currentCellId]);
    }
  }

  addMeandering(cells: number[], anchors: Point[]): [number, number, number][] {
    const runs = this.findRiverRuns(cells);
    const result: [number, number, number][] = [];
    let runPtr = 0;
    let i = 0;

    while (i < cells.length) {
      if (runPtr < runs.length && runs[runPtr].startIdx === i) {
        const run = runs[runPtr++];
        this.emitRiverRun(run, cells, result);
        i = run.endIdx; // the run's last cell may start the next run (confluence)
      } else {
        const alreadyEmitted = result.length > 0 && result[result.length - 1][2] === cells[i];
        if (!alreadyEmitted) result.push([anchors[i][0], anchors[i][1], cells[i]]);
        i++;
      }
    }

    return result;
  }

  private getPoints(group: string, cells: number[], points: Point[]) {
    if (group === "searoutes") {
      const anchors = cells.map(cellId => points[cellId]);
      return this.addMeandering(cells, anchors);
    }

    // resolve sharp angles
    const data = cells.map(cellId => [...points[cellId], cellId]);
    for (let i = 1; i < cells.length - 1; i++) {
      const cellId = cells[i];
      if (pack.cells.burg[cellId]) continue;

      const [prevX, prevY] = data[i - 1];
      const [currX, currY] = data[i];
      const [nextX, nextY] = data[i + 1];

      const dAx = prevX - currX;
      const dAy = prevY - currY;
      const dBx = nextX - currX;
      const dBy = nextY - currY;
      const angle = Math.abs((Math.atan2(dAx * dBy - dAy * dBx, dAx * dBx + dAy * dBy) * 180) / Math.PI);

      if (angle < ROUTES_SHARP_ANGLE) {
        const middleX = (prevX + nextX) / 2;
        const middleY = (prevY + nextY) / 2;
        let newX: number, newY: number;

        if (angle < ROUTES_VERY_SHARP_ANGLE) {
          newX = rn((currX + middleX * 2) / 3, 2);
          newY = rn((currY + middleY * 2) / 3, 2);
        } else {
          newX = rn((currX + middleX) / 2, 2);
          newY = rn((currY + middleY) / 2, 2);
        }

        if (Pack.findCell(newX, newY) === cellId) {
          data[i] = [newX, newY, cellId];
          points[cellId] = [data[i][0], data[i][1]]; // change cell coordinate for all routes
        }
      }
    }

    this.relax(data, points);
    return data; // [[x, y, cell], [x, y, cell]];
  }

  /** Straighten zigzags from cell to cell: a pass-through point drifts towards its neighbours' midpoint while it stays in its cell */
  private relax(data: number[][], points: Point[]) {
    const { burg } = pack.cells;
    const free = (i: number) => {
      const cellId = data[i][2];
      return !burg[cellId] && (this.adjacency.get(cellId)?.size ?? 0) <= 2;
    };
    for (let pass = 0; pass < RELAX_PASSES; pass++) {
      for (let i = 1; i < data.length - 1; i++) {
        if (!free(i)) continue;
        const [x, y, cellId] = data[i];
        const newX = rn((x + (data[i - 1][0] + data[i + 1][0]) / 2) / 2, 2);
        const newY = rn((y + (data[i - 1][1] + data[i + 1][1]) / 2) / 2, 2);
        if (Pack.findCell(newX, newY) !== cellId) continue;
        data[i] = [newX, newY, cellId];
        points[cellId] = [newX, newY];
      }
    }
  }

  // merge routes so that the last cell of one route is the first cell of the next route
  private mergeRoutes(routes: Route[]): Route[] {
    let routesMerged = 0;

    for (let i = 0; i < routes.length; i++) {
      const thisRoute = routes[i];
      if (thisRoute.merged) continue;

      for (let j = i + 1; j < routes.length; j++) {
        const nextRoute = routes[j];
        if (nextRoute.merged) continue;

        if (nextRoute.cells!.at(0) === thisRoute.cells!.at(-1)) {
          routesMerged++;
          thisRoute.cells = thisRoute.cells!.concat(nextRoute.cells!.slice(1));
          nextRoute.merged = true;
        }
      }
    }

    return routesMerged > 1 ? this.mergeRoutes(routes) : routes;
  }

  private createRoutesData(routes: Route[]) {
    const seaRoutes = this.generateSeaRoutes();
    const mainRoads = this.generateMainRoads();
    const trails = this.generateTrails();
    const pointsArray = this.preparePointsArray();

    for (const { feature, cells, merged } of this.mergeRoutes(mainRoads)) {
      if (merged) continue;
      const points = this.getPoints("roads", cells!, pointsArray);
      const name = this.generateName({ group: "roads", points });
      routes.push({ i: routes.length, group: "roads", name, feature, points, tags: [] });
    }

    for (const { feature, cells, merged } of this.mergeRoutes(trails)) {
      if (merged) continue;
      const points = this.getPoints("trails", cells!, pointsArray);
      const name = this.generateName({ group: "trails", points });
      routes.push({ i: routes.length, group: "trails", name, feature, points, tags: [] });
    }

    for (const { feature, cells, merged } of this.mergeRoutes(seaRoutes)) {
      if (merged) continue;
      const points = this.getPoints("searoutes", cells!, pointsArray);
      const name = this.generateName({ group: "searoutes", points });
      routes.push({ i: routes.length, group: "searoutes", name, feature, points, tags: [] });
    }

    return routes;
  }

  /**
   * Lay the land routes again on a finer graph, as after a submap: each route still links the burgs it linked,
   * but along the land of the new cells instead of the parent's straight lines; unlocked trails that only repeat a road are dropped
   */
  refine(): void {
    const { cells, burgs } = pack;
    this.connections = new Map();
    this.adjacency = new Map();
    this.buildRiverEdges();
    const kept = pack.routes.filter(route => route.group === "searoutes");
    for (const route of kept) this.addConnections(route.points.map(point => point[2]));
    const seaEdges = new Set(this.connections.keys());

    const living = burgs.filter(burg => burg.i && !burg.removed);
    const burgTree = quadtree(living.map(burg => [burg.x, burg.y, burg.cell] as [number, number, number]));
    const reach = grid.spacing * 2;
    const nearBurgCell = (x: number, y: number, radius: number) => burgTree.find(x, y, radius)?.[2];
    const routePoints = quadtree(
      pack.routes
        .filter(route => route.group !== "searoutes")
        .flatMap(route => route.points.map(([x, y]) => [x, y, route.i] as [number, number, number]))
    );
    const joinsOther = (route: Route, x: number, y: number, r: number) => {
      let found = false;
      routePoints.visit((node, x0, y0, x1, y1) => {
        if (found || x0 > x + r || x1 < x - r || y0 > y + r || y1 < y - r) return true;
        if (!("length" in node)) {
          for (let leaf: typeof node | undefined = node; leaf; leaf = leaf.next) {
            const [px, py, id] = leaf.data;
            if (id !== route.i && (px - x) ** 2 + (py - y) ** 2 <= r * r) found = true;
          }
        }
        return found;
      });
      return found;
    };
    const rank = (group: string) => (group === "roads" ? 0 : 1);
    const relaid = pack.routes.filter(route => !kept.includes(route)).sort((a, b) => rank(a.group) - rank(b.group));

    const pieces: Record<string, (Route & { cells: number[] })[]> = {};
    for (const route of relaid) {
      const waypoints = this.getWaypoints(route, nearBurgCell, joinsOther, reach);
      for (let k = 0; k < waypoints.length - 1; k++) {
        const segments = this.findPathSegments({ isWater: false, start: waypoints[k], exit: waypoints[k + 1] });
        for (const segment of segments) {
          if (route.group !== "roads" && !route.lock && this.isRedundant(segment)) continue;
          this.addConnections(segment);
          if (!pieces[route.group]) pieces[route.group] = [];
          pieces[route.group].push({ ...route, cells: segment, merged: false });
        }
      }
    }

    this.trimDeadEnds(Object.values(pieces).flat(), reach, seaEdges);

    // a burg the relaid lines pass by gets its own short trail
    const getCost = this.createCostEvaluator({ isWater: false });
    const onNetwork = (cellId: number) =>
      cells.h[cellId] >= 20 && [...(this.adjacency.get(cellId) ?? [])].some(next => cells.h[next] >= 20);
    for (const burg of living) {
      if (cells.h[burg.cell] < 20 || onNetwork(burg.cell)) continue;
      const path = findPath(burg.cell, onNetwork, getCost, pack);
      if (!path) continue;
      this.addConnections(path);
      if (!pieces.trails) pieces.trails = [];
      pieces.trails.push({ group: "trails", feature: cells.f[burg.cell], cells: path.reverse() } as Route & {
        cells: number[];
      });
    }

    this.cutCorners(Object.values(pieces).flat());
    this.trimDeadEnds(Object.values(pieces).flat(), reach, seaEdges);

    const pointsArray = this.preparePointsArray();
    const routes: Route[] = kept.map(route => ({ ...route }));
    const named = new Set<string>();
    for (const [group, groupPieces] of Object.entries(pieces)) {
      for (const piece of this.mergeRoutes(groupPieces.filter(piece => piece.cells.length > 1))) {
        if (piece.merged) continue;
        const points = this.getPoints(group, piece.cells!, pointsArray);
        const first = !named.has(piece.name ?? "");
        named.add(piece.name ?? "");
        const { cells: _cells, merged: _merged, label, ...rest } = piece;
        const name = rest.name ?? this.generateName({ group, points });
        routes.push({ ...rest, name, points, tags: rest.tags ?? [], ...(first && label ? { label } : {}) });
      }
    }
    pack.routes = routes.map((route, i) => ({ ...route, i }));
    cells.routes = this.buildLinks(pack.routes);
  }

  /** Cut route ends that lead nowhere: not to a burg, another route or off the map */
  private trimDeadEnds(pieces: { cells?: number[] }[], reach: number, seaEdges: Set<string>) {
    const { burg, p, h } = pack.cells;
    const { width, height } = options.map.graph;
    const loose = (cellId: number) => {
      const [x, y] = p[cellId];
      const offMap = x < reach || y < reach || x > width - reach || y > height - reach;
      const landLinks = [...(this.adjacency.get(cellId) ?? [])].filter(
        next => h[next] >= 20 && !seaEdges.has(`${cellId}-${next}`)
      ).length;
      return !burg[cellId] && !offMap && landLinks <= 1;
    };
    const unlink = (a: number, b: number) => {
      this.connections.delete(`${a}-${b}`);
      this.connections.delete(`${b}-${a}`);
      this.adjacency.get(a)?.delete(b);
      this.adjacency.get(b)?.delete(a);
    };
    let trimmed = true;
    while (trimmed) {
      trimmed = false;
      for (const piece of pieces) {
        const cells = piece.cells!;
        while (cells.length > 1 && loose(cells.at(-1)!)) {
          unlink(cells.at(-1)!, cells.at(-2)!);
          cells.pop();
          trimmed = true;
        }
        while (cells.length > 1 && loose(cells[0])) {
          unlink(cells[0], cells[1]);
          cells.shift();
          trimmed = true;
        }
      }
    }
    for (let i = pieces.length - 1; i >= 0; i--) if (pieces[i].cells!.length < 2) pieces[i].cells = [];
  }

  /** A route that steps past a cell and back, as just beyond a burg, goes straight between the two neighbours */
  private cutCorners(pieces: { cells?: number[] }[]) {
    const { burg, c, h } = pack.cells;
    for (const [cellId, links] of this.adjacency) {
      if (burg[cellId] || h[cellId] < 20) continue;
      const land = [...links].filter(next => h[next] >= 20);
      if (land.length !== 2 || links.size !== 2) continue;
      const [a, b] = land;
      if (!c[a].includes(b)) continue;
      const holders = pieces.filter(piece => piece.cells!.includes(cellId));
      const inner = holders.find(piece => {
        const i = piece.cells!.indexOf(cellId);
        return i > 0 && i < piece.cells!.length - 1;
      });
      if (this.connections.has(`${a}-${b}`) || inner) {
        // the neighbours are linked already, or one route runs through: the step aside goes
        for (const piece of holders) piece.cells!.splice(piece.cells!.indexOf(cellId), 1);
      } else if (holders.length === 2) {
        const [first, second] = holders.map(piece =>
          piece.cells![0] === cellId ? piece.cells!.reverse() : piece.cells!
        );
        first.pop();
        second.pop();
        first.push(...second.reverse());
        second.length = 0;
      } else continue;
      this.connections.delete(`${cellId}-${a}`);
      this.connections.delete(`${a}-${cellId}`);
      this.connections.delete(`${cellId}-${b}`);
      this.connections.delete(`${b}-${cellId}`);
      this.adjacency.get(a)?.delete(cellId);
      this.adjacency.get(b)?.delete(cellId);
      links.clear();
      this.linkCells(a, b);
    }
  }

  /** The cells a relaid route must pass: the burgs at and along it, or its own land ends */
  private getWaypoints(
    route: Route,
    nearBurgCell: (x: number, y: number, r: number) => number | undefined,
    joinsOther: (route: Route, x: number, y: number, r: number) => boolean,
    reach: number
  ) {
    const { h } = pack.cells;
    const onLand = route.points.filter(point => h[point[2]] >= 20);
    if (onLand.length < 2) return [];
    const waypoints: number[] = [];
    const add = (cellId: number | undefined) => {
      if (cellId !== undefined && waypoints.at(-1) !== cellId) waypoints.push(cellId);
    };
    // a loose end is kept where it joins another route or runs off the map, else it would stop at a shore
    const { width, height } = options.map.graph;
    const offMap = (x: number, y: number) => x < reach || y < reach || x > width - reach || y > height - reach;
    const joins = (x: number, y: number) => joinsOther(route, x, y, reach / 2);
    const end = ([x, y, cellId]: number[]) =>
      nearBurgCell(x, y, reach) ?? (offMap(x, y) || joins(x, y) ? cellId : undefined);
    add(end(onLand[0]));
    for (const [x, y] of onLand.slice(1, -1)) add(nearBurgCell(x, y, reach / 2));
    add(end(onLand.at(-1)!));
    return waypoints.filter((cellId, i) => waypoints.indexOf(cellId) === i);
  }

  // direction-aware river graph derived from pack.rivers
  private buildRiverEdges() {
    this.riverEdges = new Map();
    this.riversById = new Map();
    this.riverGeometryCache = new Map();
    for (const river of pack.rivers) {
      this.riversById.set(river.i, river);
      if (!river.cells || river.cells.length < 2) continue;
      for (let i = 0; i < river.cells.length - 1; i++) {
        const a = river.cells[i];
        const b = river.cells[i + 1];
        if (a < 0 || b < 0) continue;
        if (!this.riverEdges.has(a)) this.riverEdges.set(a, new Map());
        if (!this.riverEdges.has(b)) this.riverEdges.set(b, new Map());
        this.riverEdges.get(a)!.set(b, { riverId: river.i, fromIndex: i });
        this.riverEdges.get(b)!.set(a, { riverId: river.i, fromIndex: i + 1 });
      }
    }
  }

  /** custom route groups (old maps, the route groups editor) can miss a style entry - without
   * one the style editor's edits are DOM-only and presets drop the group */
  ensureRouteGroupStyles(): void {
    const { groups } = styles.routes;
    const template = groups.roads || Object.values(groups)[0];
    if (!template) return;
    // presets are also applied on initial page load, before any map (and its routes) exists
    for (const group of new Set((pack.routes ?? []).map(route => route.group))) {
      if (!groups[group]) groups[group] = structuredClone(template);
    }
  }

  buildLinks(routes: Route[]): Record<number, Record<number, number>> {
    const links: Record<number, Record<number, number>> = {};

    for (const { points, i: routeId } of routes) {
      const cells = points.map(p => p[2]);

      for (let i = 0; i < cells.length - 1; i++) {
        const cellId = cells[i];
        const nextCellId = cells[i + 1];

        if (cellId !== nextCellId) {
          if (!links[cellId]) links[cellId] = {};
          links[cellId][nextCellId] = routeId;

          if (!links[nextCellId]) links[nextCellId] = {};
          links[nextCellId][cellId] = routeId;
        }
      }
    }

    return links;
  }

  // utility functions
  isConnected(cellId: number): boolean {
    const routes = pack.cells.routes;
    return routes[cellId] && Object.keys(routes[cellId]).length > 0;
  }

  getNextId() {
    return pack.routes.length ? Math.max(...pack.routes.map(r => r.i)) + 1 : 0;
  }

  // connect cell with routes system by land
  connect(cellId: number): Route | undefined {
    const getCost = this.createCostEvaluator({ isWater: false });
    const isExit = (c: number) => isLand(c, pack) && this.isConnected(c);
    const pathCells = findPath(cellId, isExit, getCost, pack);
    if (!pathCells) return;

    const pointsArray = this.preparePointsArray();
    const points = this.getPoints("trails", pathCells, pointsArray);
    const feature = pack.cells.f[cellId];
    const routeId = this.getNextId();
    const newRoute = { i: routeId, group: "trails", feature, points, tags: [] };
    pack.routes.push(newRoute as Route);

    const addConnection = (from: number, to: number, routeId: number) => {
      const routes = pack.cells.routes;

      if (!routes[from]) routes[from] = {};
      routes[from][to] = routeId;

      if (!routes[to]) routes[to] = {};
      routes[to][from] = routeId;
    };

    for (let i = 0; i < pathCells.length; i++) {
      const currentCell = pathCells[i];
      const nextCellId = pathCells[i + 1];
      if (nextCellId) addConnection(currentCell, nextCellId, routeId);
    }

    return newRoute as Route;
  }

  areConnected(from: number, to: number): boolean {
    const routeId = pack.cells.routes[from]?.[to];
    return routeId !== undefined;
  }

  getRoute(from: number, to: number) {
    const routeId = pack.cells.routes[from]?.[to];
    if (routeId === undefined) return null;

    const route = pack.routes.find(route => route.i === routeId);
    if (!route) return null;

    return route;
  }

  hasRoad(cellId: number): boolean {
    const connections = pack.cells.routes[cellId];
    if (!connections) return false;

    return Object.values(connections).some(routeId => {
      const route = pack.routes.find(route => route.i === routeId);
      if (!route) return false;
      return route.group === "roads";
    });
  }

  isCrossroad(cellId: number): boolean {
    const connections = pack.cells.routes[cellId];
    if (!connections) return false;
    if (Object.keys(connections).length > 3) return true;
    const roadConnections = Object.values(connections).filter(routeId => {
      const route = pack.routes.find(route => route.i === routeId);
      return route?.group === "roads";
    });
    return roadConnections.length > 2;
  }

  /** Build a route between two burgs along the cheapest path: roads and trails by land, searoutes by water. Returns its id */
  add(fromBurgId: number, toBurgId: number, group: string): number {
    const groups = Object.keys(styles.routes.groups);
    requireOneOf(group, groups, "The group");
    const [from, to] = [fromBurgId, toBurgId].map(id => {
      const burg = pack.burgs[id];
      if (!id || !burg || burg.removed) throw new Error(`Burg ${id} does not exist`);
      return burg;
    });
    if (from === to) throw new Error("A route connects two different burgs");

    const isWater = group === "searoutes";
    const cells = isWater
      ? this.findWaterPath(from.cell, to.cell)
      : findPath(from.cell, (next: number) => next === to.cell, this.getLandPathCost.bind(this), pack);
    if (!cells) throw new Error(`There is no ${isWater ? "water" : "land"} path from burg ${from.i} to burg ${to.i}`);

    const points = isWater ? this.getWaterPoints(cells) : this.getPoints(group, cells, this.preparePointsArray());
    const i = this.getNextId();
    const route: Route = { i, group, feature: pack.cells.f[from.cell], points, tags: [] };
    route.name = this.generateName(route);
    pack.routes.push(route);
    const links = pack.cells.routes;
    for (let index = 0; index < cells.length - 1; index++) {
      const [a, b] = [cells[index], cells[index + 1]];
      links[a] = { ...links[a], [b]: i };
      links[b] = { ...links[b], [a]: i };
    }
    return i;
  }

  /** Move a route to another route group, such as roads, trails or searoutes */
  setGroup(routeId: number, group: string): void {
    this.living(routeId).group = requireOneOf(group, Object.keys(styles.routes.groups), "The group");
  }

  /** Lock a route so regeneration keeps it, or unlock it */
  setLocked(routeId: number, locked: boolean): void {
    const route = this.living(routeId);
    if (locked) route.lock = true;
    else delete route.lock;
  }

  /** Draw a route in a group through map points [x, y], each in the cell under it. Returns its id */
  create(points: number[][], group: string): number {
    requireOneOf(group, Object.keys(styles.routes.groups), "The group");
    if (!Array.isArray(points) || points.length < 2) throw new Error("A route needs at least 2 points");
    const routePoints = points.map(point => {
      if (!Array.isArray(point)) throw new Error("A route point is [x, y]");
      const [x, y] = point;
      return [rn(x, 2), rn(y, 2), Pack.requireCell(x, y)];
    });
    const i = this.getNextId();
    pack.routes.push({ i, group, feature: pack.cells.f[routePoints[0][2]], points: routePoints, tags: [] } as Route);
    this.link(routePoints, i);
    return i;
  }

  /** Split a route at one of its inner points: the route ends there and a new one of the same group goes on. Returns the new id */
  split(routeId: number, pointIndex: number): number {
    const route = this.living(routeId);
    if (!Number.isInteger(pointIndex) || pointIndex < 1 || pointIndex > route.points.length - 2)
      throw new Error(`Point ${pointIndex} is not an inner point of route ${routeId}; points are counted from 0`);
    const tail = route.points.slice(pointIndex);
    route.points = route.points.slice(0, pointIndex + 1);
    const i = this.getNextId();
    pack.routes.push({
      i,
      group: route.group,
      feature: route.feature,
      name: route.name,
      points: tail,
      tags: [...(route.tags ?? [])]
    } as Route);
    this.link(tail, i);
    return i;
  }

  /** Join a route of the same group that starts or ends where this one starts or ends; the other route is removed */
  join(routeId: number, otherId: number): void {
    const route = this.living(routeId);
    const other = this.living(otherId);
    if (route === other) throw new Error("A route cannot join itself");
    if (route.group !== other.group) throw new Error(`Routes ${routeId} and ${otherId} are in different groups`);
    const points = mergeRoutePoints(route.points, other.points);
    if (!points) throw new Error(`Routes ${routeId} and ${otherId} share no endpoint`);
    route.points = points;
    Tags.add(route, other.tags ?? []);
    this.link(points, route.i);
    this.remove(otherId);
  }

  /** Connect consecutive points' cells in the cell links */
  private link(points: number[][], routeId: number): void {
    const links = pack.cells.routes;
    for (let index = 0; index < points.length - 1; index++) {
      const [a, b] = [points[index][2], points[index + 1][2]];
      if (a === b) continue;
      links[a] = { ...links[a], [b]: routeId };
      links[b] = { ...links[b], [a]: routeId };
    }
  }

  private living(routeId: number): Route {
    const route = pack.routes.find(({ i }) => i === routeId);
    if (!route) throw new Error(`Route ${routeId} does not exist`);
    return route;
  }

  /** Remove a route and its cell connections */
  remove(routeId: number) {
    const route = this.living(routeId);
    const routes = pack.cells.routes;

    for (const point of route.points) {
      const from = point[2];
      if (!routes[from]) continue;

      for (const [to, routeId] of Object.entries(routes[from])) {
        if (routeId === route.i) {
          const toCell = parseInt(to, 10);
          delete routes[from][toCell];
          if (routes[toCell]) delete routes[toCell][from];
        }
      }
    }

    pack.routes = pack.routes.filter(r => r.i !== route.i);
  }

  getConnectivityRate(cellId: number): number {
    const connections = pack.cells.routes[cellId];
    if (!connections) return 0;

    const connectivityRateMap: Record<string, number> = {
      roads: 0.2,
      trails: 0.1,
      searoutes: 0.2,
      default: 0.1
    };

    const connectivity = Object.values(connections).reduce((acc, routeId) => {
      const route = pack.routes.find(route => route.i === routeId);
      if (!route) return acc;
      const rate = connectivityRateMap[route.group] || connectivityRateMap.default;
      return acc + rate;
    }, 0.8);

    return connectivity;
  }

  generateName({ group, points }: { group: string; points: number[][] }): string | undefined {
    if (points.length < 4) return undefined;

    function getBurgName() {
      const priority = [points.at(-1), points.at(0), points.slice(1, -1).reverse()];
      for (const [_x, _y, cellId] of priority as [number, number, number][]) {
        const burgId = pack.cells.burg[cellId];
        if (burgId) return getAdjective(pack.burgs[burgId].name!);
      }
      return null;
    }

    const model = rw(models[group] || models.roads);
    const suffix = rw(suffixes[group] || suffixes.roads);

    const burgName = getBurgName();
    if (burgName) {
      if (model === "burg_suffix") return `${burgName} ${suffix}`;
      if (model === "the_descriptor_burg_suffix") return `The ${ra(descriptors)} ${burgName} ${suffix}`;
    }
    if (model === "the_descriptor_prefix_suffix") return `The ${ra(descriptors)} ${ra(prefixes)} ${suffix}`;
    return `${ra(prefixes)} ${suffix}`; // no burg on the route, fall back to the burg-free model
  }

  private ROUTE_CURVES: Record<string, any> = {
    roads: curveCatmullRom.alpha(0.1),
    trails: curveCatmullRom.alpha(0.1),
    searoutes: curveCatmullRom.alpha(0.5),
    default: curveCatmullRom.alpha(0.1)
  };

  getPath({ group, points }: { group: string; points: number[][] }): string {
    const lineGen = line();
    const curve = this.ROUTE_CURVES[group] || this.ROUTE_CURVES.default;
    lineGen.curve(curve);
    const path = round(lineGen(points.map(p => [p[0], p[1]]))!, 1);
    return path;
  }

  getLength(routeId: number): number {
    const route = pack.routes.find(route => route.i === routeId);
    if (!route) return 0;

    // measured off-DOM: the rendered layer only holds the routes currently in the viewport
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", this.getPath(route));
    return path.getTotalLength();
  }

  // run on map load to restore connections based on routes data
  sync() {
    this.connections = new Map();
    this.adjacency = new Map();
    this.buildRiverEdges();
    for (const route of pack.routes) {
      for (let i = 0; i < route.points.length - 1; i++) {
        const cellId = route.points[i][2];
        const nextCellId = route.points[i + 1][2];
        this.linkCells(cellId, nextCellId);
      }
    }
  }
}

declare global {
  var Routes: RoutesModule;
}

/** The points of two routes that share an endpoint, as one route; null when they share none */
export function mergeRoutePoints(routePoints: number[][], joinedPoints: number[][]): number[][] | null {
  if (!routePoints.length || !joinedPoints.length) return null;

  const routeStart = routePoints.at(0)?.[2];
  const routeEnd = routePoints.at(-1)?.[2];
  const joinedStart = joinedPoints.at(0)?.[2];
  const joinedEnd = joinedPoints.at(-1)?.[2];

  if (routeEnd === joinedStart) return [...routePoints, ...joinedPoints.slice(1)];
  if (routeStart === joinedEnd) return [...joinedPoints, ...routePoints.slice(1)];
  if (routeStart === joinedStart) return [...[...routePoints].reverse(), ...joinedPoints.slice(1)];
  if (routeEnd === joinedEnd) return [...routePoints, ...[...joinedPoints].reverse().slice(1)];
  return null;
}

// biome-ignore lint/suspicious/noRedeclare: legacy seam
export const Routes = new RoutesModule();
window.Routes = Routes;
