import fs from "fs";
import path from "path";
import type { DocumentStorage, StoredObject } from "./types.js";

export function createLocalStorage(basePath: string): DocumentStorage {
  function ensureDir() {
    const dir = path.resolve(basePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  return {
    backend: "local",
    async save({ buffer, storedFilename }) {
      const dir = ensureDir();
      const storagePath = path.join(dir, storedFilename);
      await fs.promises.writeFile(storagePath, buffer);
      return { storagePath, storedFilename };
    },
    async exists(storagePath) {
      return fs.existsSync(storagePath);
    },
    async createReadStream(storagePath) {
      return fs.createReadStream(storagePath);
    },
  };
}
