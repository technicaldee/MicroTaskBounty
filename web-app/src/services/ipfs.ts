// @ts-ignore - web3.storage may not have type definitions
import { Web3Storage } from 'web3.storage';

class IPFSService {
  private client: Web3Storage | null = null;

  initialize(token: string) {
    this.client = new Web3Storage({ token });
  }

  async uploadImage(file: File, metadata: Record<string, any>): Promise<string> {
    if (!this.client) {
      throw new Error('IPFS service not initialized. Please set WEB3_STORAGE_TOKEN.');
    }

    // Create metadata file
    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const metadataFile = new File([metadataBlob], 'metadata.json', { type: 'application/json' });

    // Upload both image and metadata
    const files = [file, metadataFile];
    const cid = await this.client.put(files);

    return cid;
  }

  async uploadMultipleImages(files: File[], metadata: Record<string, any>): Promise<string> {
    if (!this.client) {
      throw new Error('IPFS service not initialized');
    }

    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const metadataFile = new File([metadataBlob], 'metadata.json', { type: 'application/json' });

    const allFiles = [...files, metadataFile];
    const cid = await this.client.put(allFiles);

    return cid;
  }

  getGatewayUrl(cid: string, filename?: string): string {
    if (filename) {
      return `https://${cid}.ipfs.w3s.link/${filename}`;
    }
    return `https://${cid}.ipfs.w3s.link/`;
  }

  async retrieve(cid: string): Promise<any> {
    if (!this.client) {
      throw new Error('IPFS service not initialized');
    }

    const res = await this.client.get(cid);
    if (!res) {
      throw new Error('Failed to retrieve from IPFS');
    }

    const files = await res.files();
    return files;
  }
}

export const ipfsService = new IPFSService();

