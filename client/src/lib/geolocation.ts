import { QUICK_PICK_CITIES } from '@/config/cities';
import type { LocationOption } from '@/types';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Finds the nearest curated city within 45 km or builds a clean GPS location option.
 */
export function resolveCoordinatesToLocation(lat: number, lng: number): LocationOption {
  let nearest: LocationOption | null = null;
  let nearestDist = Number.POSITIVE_INFINITY;

  for (const city of QUICK_PICK_CITIES) {
    const dist = haversineKm(lat, lng, city.lat, city.lng);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = city;
    }
  }

  if (nearest && nearestDist <= 45) {
    return nearest;
  }

  const roundedLat = Number(lat.toFixed(2));
  const roundedLng = Number(lng.toFixed(2));
  return {
    locationId: `gps-${roundedLat}-${roundedLng}`,
    city: 'Your Area',
    state: '',
    country: 'India',
    label: `Your Current Location (${roundedLat}, ${roundedLng})`,
    lat: roundedLat,
    lng: roundedLng,
  };
}

export function detectUserGpsLocation(): Promise<LocationOption> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location detection is not supported in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(
          resolveCoordinatesToLocation(position.coords.latitude, position.coords.longitude),
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Location permission was blocked. Please pick your city below.'));
        } else {
          reject(new Error('Could not detect GPS location right now. Please select a city.'));
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  });
}
