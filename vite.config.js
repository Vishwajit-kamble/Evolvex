// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api1": {
        target: "http://evolvexai.vercel.app",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api1/, ""),
      },
      "/api2": {
        target: "https://evolvex.onrender.com/api/code",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api2/, ""),
      },
      "/api3": {
        target: "https://falcons-algoforge.onrender.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api3/, ""),
      },
      "/api": {
        target: "https://localhost:5000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api3/, ""),
      },
    },
  },
});
