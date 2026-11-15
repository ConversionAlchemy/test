// No rivers on the region map: they still carve the land and fill the lakes, then are taken away
export function dropRivers(): void {
  pack.rivers = [];
  pack.cells.r?.fill(0);
  pack.cells.conf?.fill(0);
}
