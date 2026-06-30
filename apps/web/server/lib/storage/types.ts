export type StorageBackend = "local" | "r2";

export interface StoredObject {
  storagePath: string;
  storedFilename: string;
}

export interface DocumentStorage {
  backend: StorageBackend;
  save(params: {
    buffer: Buffer;
    storedFilename: string;
    mimeType: string;
  }): Promise<StoredObject>;
  exists(storagePath: string): Promise<boolean>;
  createReadStream(storagePath: string): Promise<NodeJS.ReadableStream>;
}
