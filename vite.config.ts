import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      workbox: {
        // O padrão do workbox não cobre fontes — sem isto o app instalado
        // perderia Anton e Poppins justamente quando está offline.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      manifest: {
        name: "Mímica na Régua",
        short_name: "Mímica",
        description: "Jogo de mímica para jogar com amigos e família",
        lang: "pt-BR",
        display: "fullscreen",
        orientation: "portrait",
        background_color: "#14070c",
        theme_color: "#14070c",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ],
  test: {
    environment: "node"
  }
} as any);
