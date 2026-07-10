import { defineConfig } from "vite";

// On GitHub Pages the app is served from https://<owner>.github.io/<repo>/,
// so the build needs a matching base path. In CI, derive it from the
// GITHUB_REPOSITORY environment variable. Locally (and for user/org pages or a
// custom domain) it defaults to "/". Override with the BASE_PATH env var.
function resolveBase(): string {
  if (process.env.BASE_PATH) {
    return process.env.BASE_PATH;
  }
  const repo = process.env.GITHUB_REPOSITORY; // "owner/repo"
  if (repo && process.env.GITHUB_ACTIONS) {
    const name = repo.split("/")[1] ?? "";
    if (name && !name.endsWith(".github.io")) {
      return `/${name}/`;
    }
  }
  return "/";
}

// The OAuth redirect URI registered in the ArcGIS app must match the deployed
// origin (including the base path when hosted on GitHub Pages).
export default defineConfig({
  base: resolveBase(),
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
});
