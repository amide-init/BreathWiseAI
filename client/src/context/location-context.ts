import { createContext } from 'react';

import type { SavedCityModel } from '@/services/saved-cities.service';
import type { LocationOption } from '@/types';

export interface LocationContextValue {
  selectedLocation: LocationOption;
  selectedLocationNickname: string | null;
  selectedLocationDisplayName: string;
  savedCities: SavedCityModel[];
  isPickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  selectLocation: (location: LocationOption) => Promise<void>;
  saveCity: (location: LocationOption, nickname?: string | null) => Promise<SavedCityModel | null>;
  removeSavedCity: (locationId: string) => Promise<void>;
}

export const LocationContext = createContext<LocationContextValue | null>(null);
