import type { NextConfig } from "next";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/:path*",
          destination: "http://localhost:4000/api/:path*",
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
