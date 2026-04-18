import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.8.113",
    "localhost",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  // Пустой объект — формально сигнализирует Turbopack-у, что конфиг есть
  turbopack: {},
};

export default withSerwist(nextConfig);