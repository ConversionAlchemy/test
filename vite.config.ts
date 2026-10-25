import { execSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";

// Fluoria: the commit a build came from, shown on the loading screen
const commit = (() => {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "dev";
  }
})();

/**
 * The desktop app ships the same renderer, minus the parts that only make sense on the web:
 * Google Analytics (a program that phones home on launch is a different bargain than a web page),
 * and the PWA plumbing, which `services/platform.ts` already skips under Electron
 */
const stripWebOnlyTags = {
  name: "strip-web-only-tags",
  transformIndexHtml: (html: string) =>
    html
      .replace(/<script async src="https:\/\/www\.googletagmanager\.com[^>]*><\/script>\s*/, "")
      .replace(/<script>\s*window\.dataLayer[\s\S]*?<\/script>\s*/, "")
      .replace(/<link rel="manifest"[^>]*>\s*/, "")
};

export default ({ mode }: { mode: string }) => ({
  root: "./src",
  base: mode === "electron" ? "./" : process.env.NETLIFY ? "/" : (process.env.BASE_PATH ?? "/Fantasy-Map-Generator/"),
  plugins: mode === "electron" ? [stripWebOnlyTags] : [],
  build: {
    outDir: mode === "electron" ? "../dist-electron/renderer" : "../dist",
    assetsDir: "./",
    emptyOutDir: true, // outDir sits outside root, so Vite would otherwise keep every past build's chunks
    rollupOptions: {
      output: {
        // icon-sets.ts loads each set's SVGs on demand; one chunk per set: relief sets and charge categories are subdirectories
        manualChunks(id: string) {
          const path = id.match(/src\/assets\/icons\/(.+)\/[^/]+\.svg/)?.[1];
          if (!path) return undefined;
          const [family, set] = path.split("/");
          return family === "relief" || family === "charges" ? `icons-${family}-${set}` : `icons-${family}`;
        }
      }
    }
  },
  publicDir: "../public",
  define: { __FL_COMMIT__: JSON.stringify(commit) },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
