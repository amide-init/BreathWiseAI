import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DEFAULT_CITY } from '@/config/cities';
import { LocationContext, type LocationContextValue } from '@/context/location-context';
import { useAuth } from '@/hooks/useAuth';
import { saveUserPrimaryLocation } from '@/services/user.service';
import type { LocationOption } from '@/types';

const STORAGE_KEY = 'breathewise:selected_location';

function readStoredLocation(): LocationOption {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_CITY;
    }
    const parsed = JSON.parse(raw) as LocationOption;
    if (parsed?.locationId && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
      return parsed;
    }
  } catch {
    // Ignore malformed local storage
  }
  return DEFAULT_CITY;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user, userProfile } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<LocationOption>(readStoredLocation);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Sync saved primaryLocation from Firestore user profile when available
  useEffect(() => {
    if (userProfile?.primaryLocation?.locationId) {
      setSelectedLocation(userProfile.primaryLocation);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile.primaryLocation));
      } catch {
        // Ignore storage quota errors
      }
    }
  }, [userProfile]);

  const selectLocation = useCallback(
    async (location: LocationOption) => {
      setSelectedLocation(location);
      setIsPickerOpen(false);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
      } catch {
        // Ignore storage errors
      }
      if (user) {
        try {
          await saveUserPrimaryLocation(user.uid, location);
        } catch {
          // Non-fatal if Firestore rules/network temporarily unavailable
        }
      }
    },
    [user],
  );

  const value = useMemo<LocationContextValue>(
    () => ({
      selectedLocation,
      isPickerOpen,
      openPicker: () => setIsPickerOpen(true),
      closePicker: () => setIsPickerOpen(false),
      selectLocation,
    }),
    [selectedLocation, isPickerOpen, selectLocation],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}
