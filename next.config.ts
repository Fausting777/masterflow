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
  turbopack: {},
  outputFileTracingIncludes: {
    '/orders/**': ['./public/fonts/**/*'],
  },
};

export default withSerwist(nextConfig);