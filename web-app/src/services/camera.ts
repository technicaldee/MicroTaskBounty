export interface PhotoData {
  uri: string;
  base64?: string;
  width: number;
  height: number;
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

class CameraService {
  async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  async capturePhoto(videoElement: HTMLVideoElement): Promise<PhotoData> {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(videoElement, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    return {
      uri: dataUrl,
      base64: dataUrl.split(',')[1],
      width: canvas.width,
      height: canvas.height,
      timestamp: Date.now(),
    };
  }

  async compressImage(dataUrl: string, maxSizeMB: number = 2): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if needed
        if (width > 1920) {
          height = (height * 1920) / width;
          width = 1920;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        let compressed = canvas.toDataURL('image/jpeg', quality);

        // Check size and compress more if needed
        const sizeMB = (compressed.length * 3) / 4 / 1024 / 1024;
        if (sizeMB > maxSizeMB) {
          quality = 0.6;
          compressed = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(compressed);
      };
      img.src = dataUrl;
    });
  }

  async generateImageHash(dataUrl: string): Promise<string> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

export const cameraService = new CameraService();
