import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DEFAULT_CITY } from '@/config/cities';
import { LocationContext, type LocationContextValue } from '@/context/location-context';
import { useAuth } from '@/hooks/useAuth';
import {
  listCachedSavedCities,
  listSavedCities,
  removeUserCity,
  saveUserCity,
  type SavedCityModel,
} from '@/services/saved-cities.service';
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
  const { user, userProfile, updateUser } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<LocationOption>(readStoredLocation);
  const [savedCities, setSavedCities] = useState<SavedCityModel[]>([]);
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

  // Load user's saved/labeled cities under users/{uid}/saved_cities
  useEffect(() => {
    if (!user) {
      setSavedCities([]);
      return;
    }
    let cancelled = false;
    void listCachedSavedCities(user.uid).then((cached) => {
      if (!cancelled && cached && cached.length > 0) {
        setSavedCities(cached);
      }
    });
    void listSavedCities(user.uid)
      .then((fresh) => {
        if (!cancelled) {
          setSavedCities(fresh);
        }
      })
      .catch(() => {
        // Non-blocking: quick-pick and search still work without saved cities
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

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
          await updateUser({ primaryLocation: location });
        } catch {
          // Non-fatal if Firestore rules/network temporarily unavailable
        }
      }
    },
    [user, updateUser],
  );

  const saveCity = useCallback(
    async (location: LocationOption, nickname?: string | null): Promise<SavedCityModel | null> => {
      if (!user) {
        return null;
      }
      const saved = await saveUserCity(user.uid, location, nickname);
      setSavedCities((prev) => [saved, ...prev.filter((c) => c.locationId !== saved.locationId)]);
      return saved;
    },
    [user],
  );

  const removeSavedCity = useCallback(
    async (locationId: string): Promise<void> => {
      if (!user) {
        return;
      }
      await removeUserCity(user.uid, locationId);
      setSavedCities((prev) => prev.filter((c) => c.locationId !== locationId));
    },
    [user],
  );

  const selectedLocationNickname = useMemo(() => {
    const match = savedCities.find((c) => c.locationId === selectedLocation.locationId);
    const trimmed = match?.nickname?.trim();
    return trimmed ? trimmed : null;
  }, [savedCities, selectedLocation.locationId]);

  const selectedLocationDisplayName = selectedLocationNickname
    ? `${selectedLocationNickname} · ${selectedLocation.city}`
    : selectedLocation.city;

  const value = useMemo<LocationContextValue>(
    () => ({
      selectedLocation,
      selectedLocationNickname,
      selectedLocationDisplayName,
      savedCities,
      isPickerOpen,
      openPicker: () => setIsPickerOpen(true),
      closePicker: () => setIsPickerOpen(false),
      selectLocation,
      saveCity,
      removeSavedCity,
    }),
    [
      selectedLocation,
      selectedLocationNickname,
      selectedLocationDisplayName,
      savedCities,
      isPickerOpen,
      selectLocation,
      saveCity,
      removeSavedCity,
    ],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}
