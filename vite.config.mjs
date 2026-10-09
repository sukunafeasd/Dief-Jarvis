import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { previewVoicePlugin } from "./desktop/preview-voice.mjs";
export default defineConfig({
  plugins: [react(), previewVoicePlugin()],
  base: "./",
  server: {
    host: "127.0.0.1",
    strictPort: true,
    watch: { ignored: ["**/release/**", "**/artifacts/**"] },
  },
  build: { target: "es2022" },
});
