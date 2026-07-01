import type { NextConfig } from "next";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const rewrites = [{ source: "/favicon.ico", destination: "/icon" }];

    if (process.env.NODE_ENV === "development") {
      rewrites.push({
        source: "/api/:path*",
        destination: "http://localhost:4000/api/:path*",
      });
    }

    return rewrites;
  },
};

export default nextConfig;
