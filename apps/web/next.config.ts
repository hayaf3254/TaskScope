import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack用の空設定（Next.js 16でエラー回避）
  turbopack: {},

  // Docker環境でのホットリロード用設定（Webpack mode）
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
