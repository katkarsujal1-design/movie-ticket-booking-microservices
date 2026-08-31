import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const notificationProxyTarget =
  process.env.NOTIFICATION_PROXY_TARGET || "http://localhost:3005";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/notification-api": {
        target: notificationProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/notification-api/, "")
      }
    }
  }
});
