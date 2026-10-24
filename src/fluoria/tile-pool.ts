// Paints tiles on several background workers at once; where workers can't start, paints on the main thread
import { paintTile, type TileJob, type WorldModel } from "./world-model";

interface Pending {
  resolve: (pixels: Uint32Array | null) => void;
  version: number;
}

export class TilePool {
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private queue: { id: number; job: TileJob }[] = [];
  private pending = new Map<number, Pending>();
  private model: WorldModel | null = null;
  private version = 0;
  private nextId = 0;

  constructor() {
    const count = Math.max(1, Math.min(6, (navigator.hardwareConcurrency || 2) - 1));
    try {
      for (let k = 0; k < count; k++) {
        const worker = new Worker(new URL("./tile-worker.ts", import.meta.url), { type: "module" });
        worker.onmessage = event => this.done(worker, event.data);
        worker.onerror = () => this.fallBack();
        this.workers.push(worker);
        this.idle.push(worker);
      }
    } catch {
      this.fallBack();
    }
  }

  /** How many tiles can be painted at once */
  get width(): number {
    return Math.max(1, this.workers.length);
  }

  get busy(): number {
    return this.pending.size;
  }

  /** A new world: jobs for the old one are dropped */
  setModel(model: WorldModel): void {
    this.model = model;
    this.version++;
    for (const [, pending] of this.pending) pending.resolve(null);
    this.pending.clear();
    this.queue = [];
    this.idle = [...this.workers];
    for (const worker of this.workers) worker.postMessage({ type: "model", model, version: this.version });
  }

  /** Paint a tile; resolves null if the world changed before it was done */
  paint(job: TileJob): Promise<Uint32Array | null> {
    const id = this.nextId++;
    return new Promise(resolve => {
      this.pending.set(id, { resolve, version: this.version });
      if (!this.workers.length) {
        const model = this.model;
        const version = this.version;
        setTimeout(() => {
          const pending = this.pending.get(id);
          this.pending.delete(id);
          pending?.resolve(model && version === this.version ? paintTile(model, job) : null);
        }, 0);
        return;
      }
      this.queue.push({ id, job });
      this.pump();
    });
  }

  private pump(): void {
    while (this.idle.length && this.queue.length) {
      const worker = this.idle.pop() as Worker;
      const next = this.queue.shift() as { id: number; job: TileJob };
      worker.postMessage({ type: "tile", ...next });
    }
  }

  private done(worker: Worker, data: { id: number; version: number; pixels: Uint32Array }): void {
    const pending = this.pending.get(data.id);
    this.pending.delete(data.id);
    if (!this.idle.includes(worker)) this.idle.push(worker);
    pending?.resolve(data.version === this.version ? data.pixels : null);
    this.pump();
  }

  /** Workers failed: finish everything on the main thread from now on */
  private fallBack(): void {
    for (const worker of this.workers) worker.terminate();
    this.workers = [];
    this.idle = [];
    const queued = this.queue;
    this.queue = [];
    for (const { id, job } of queued) {
      const pending = this.pending.get(id);
      this.pending.delete(id);
      if (pending) void this.paint(job).then(pending.resolve);
    }
  }
}
