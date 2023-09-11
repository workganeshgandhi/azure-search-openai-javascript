import path from 'node:path';
import { BaseLogger } from 'pino';
import { AzureClients } from '../plugins/azure';

export class BlobStorage {
  constructor(
    private logger: BaseLogger,
    private azure: AzureClients,
  ) {}

  async upload(filename: string, data: Buffer, type: string) {
    const blobContainer = this.azure.blobContainer;
    await blobContainer.createIfNotExists();

    const blobName = getBlobNameFromFile(filename);
    const blockBlobClient = blobContainer.getBlockBlobClient(blobName);

    this.logger.debug(`Uploading blob: ${blobName}...`);

    await blockBlobClient.uploadData(data, { blobHTTPHeaders: { blobContentType: type } });
  }

  async delete(filename: string) {
    const blobContainer = this.azure.blobContainer;
    if (await blobContainer.exists()) {
      if (!filename) {
        throw new Error('Filename is required');
      } else {
        const name = getBlobNameFromFile(filename);
        const re = new RegExp(`${name}`, 'i');

        const allBlobs = await blobContainer.listBlobsFlat({ prefix: name });
        for await (const blob of allBlobs) {
          if (re.test(blob.name)) {
            this.logger.debug(`Removing blob: ${blob.name}...`);
            await blobContainer.deleteBlob(blob.name);
          }
        }
      }
    }
  }

  async deleteAll() {
    const blobContainer = this.azure.blobContainer;
    if (await blobContainer.exists()) {
      const allBlobs = await blobContainer.listBlobsFlat();
      for await (const blob of allBlobs) {
        this.logger.debug(`Removing blob: ${blob.name}...`);
        await blobContainer.deleteBlob(blob.name);
      }
    }
  }
}

export function getBlobNameFromFile(filename: string): string {
  return path.basename(filename);
}