// A background painter: holds the world model it was last sent and paints tiles from it on request
import { paintTile, type TileJob, type WorldModel } from "./world-model";

let model: WorldModel | null = null;
let version = -1;

type Message = { type: "model"; model: WorldModel; version: number } | { type: "tile"; id: number; job: TileJob };

self.onmessage = (event: MessageEvent<Message>) => {
  const message = event.data;
  if (message.type === "model") {
    model = message.model;
    version = message.version;
    return;
  }
  if (!model) return;
  const pixels = paintTile(model, message.job);
  (self as unknown as Worker).postMessage({ id: message.id, version, pixels }, [pixels.buffer]);
};
