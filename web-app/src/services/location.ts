export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

class LocationService {
  async requestPermissions(): Promise<boolean> {
    if (!navigator.geolocation) {
      return false;
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false)
      );
    });
  }

  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || undefined,
            timestamp: position.timestamp,
          });
        },
        (error) => reject(error)
      );
    });
  }

  watchLocation(callback: (location: LocationData) => void): number {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported');
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || undefined,
          timestamp: position.timestamp,
        });
      },
      (error) => console.error('Location error:', error),
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  }

  stopWatching(watchId: number) {
    navigator.geolocation.clearWatch(watchId);
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  isWithinRadius(
    userLat: number,
    userLon: number,
    taskLat: number,
    taskLon: number,
    radius: number
  ): boolean {
    const distance = this.calculateDistance(userLat, userLon, taskLat, taskLon);
    return distance <= radius;
  }
}

export const locationService = new LocationService();
