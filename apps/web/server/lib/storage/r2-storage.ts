import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { DocumentStorage } from "./types.js";

export interface R2StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  prefix: string;
}

function buildObjectKey(prefix: string, storedFilename: string): string {
  const normalized = prefix.replace(/^\/+|\/+$/g, "");
  return normalized ? `${normalized}/${storedFilename}` : storedFilename;
}

export function createR2Storage(config: R2StorageConfig): DocumentStorage {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    backend: "r2",
    async save({ buffer, storedFilename, mimeType }) {
      const storagePath = buildObjectKey(config.prefix, storedFilename);
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: storagePath,
          Body: buffer,
          ContentType: mimeType,
        })
      );
      return { storagePath, storedFilename };
    },
    async exists(storagePath) {
      try {
        await client.send(
          new HeadObjectCommand({
            Bucket: config.bucket,
            Key: storagePath,
          })
        );
        return true;
      } catch {
        return false;
      }
    },
    async createReadStream(storagePath) {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: storagePath,
        })
      );
      if (!response.Body) {
        throw new Error("Oggetto R2 senza body");
      }
      return response.Body as NodeJS.ReadableStream;
    },
  };
}
