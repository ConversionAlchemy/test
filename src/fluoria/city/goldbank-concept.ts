// Goldbank's city on its own page, from a cut of the region map's data

import type { Region } from "./city-gen";
import { mountCity } from "./city-view";

declare const REGION: Region;
mountCity(document.getElementById("city") as HTMLElement, REGION, "Goldbank");
