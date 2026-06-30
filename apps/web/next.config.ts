import type { NextConfig } from "next";
import dotenv from "dotenv";
import path from "path";

// Carica .env dalla root del monorepo (stesso file usato da API e Prisma)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
