import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker環境でのホットリロード用設定
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000, // 1秒ごとにポーリング
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
