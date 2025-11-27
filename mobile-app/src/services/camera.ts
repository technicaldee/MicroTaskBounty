import * as Camera from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

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
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === 'granted';
  }

  async compressImage(uri: string, maxSizeMB: number = 2): Promise<string> {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1920 } }], // Resize to max width
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Check file size and compress further if needed
    const response = await fetch(manipResult.uri);
    const blob = await response.blob();
    const sizeMB = blob.size / (1024 * 1024);

    if (sizeMB > maxSizeMB) {
      // Compress more aggressively
      const furtherCompressed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }],
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return furtherCompressed.uri;
    }

    return manipResult.uri;
  }

  async generateImageHash(uri: string): Promise<string> {
    // In production, use a proper image hashing library
    // For now, return a simple hash based on URI and timestamp
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    
    // Simple hash - in production, use perceptual hashing
    const hash = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }
}

export const cameraService = new CameraService();

