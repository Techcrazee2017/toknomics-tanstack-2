import { defineConfig } from "@leadconnector/vite-tanstack-config";

export default defineConfig({
  devServerBridge: { errorCollector: false },
  tanstackStart: { server: { entry: "server" } },
  vite: {
    server: {
      host: "::",
      port: 8080,
      allowedHosts: [".modal.host"],
      watch: { awaitWriteFinish: { stabilityThreshold: 2000 } },
      hmr: { timeout: 30000, overlay: false },
    },
  },
});
