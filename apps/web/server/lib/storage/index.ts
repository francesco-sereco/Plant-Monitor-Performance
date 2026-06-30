import { config } from "../config.js";
import { createLocalStorage } from "./local-storage.js";
import { createR2Storage } from "./r2-storage.js";
import type { DocumentStorage } from "./types.js";

let storageInstance: DocumentStorage | null = null;

export function getDocumentStorage(): DocumentStorage {
  if (storageInstance) return storageInstance;

  if (config.storage.backend === "r2") {
    const { r2 } = config.storage;
    storageInstance = createR2Storage({
      accountId: r2.accountId,
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      bucket: r2.bucket,
      prefix: r2.prefix,
    });
    return storageInstance;
  }

  storageInstance = createLocalStorage(config.storage.localPath);
  return storageInstance;
}

export type { DocumentStorage, StorageBackend, StoredObject } from "./types.js";
