import { createContext } from 'react';

import type { LocationOption } from '@/types';

export interface LocationContextValue {
  selectedLocation: LocationOption;
  isPickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  selectLocation: (location: LocationOption) => Promise<void>;
}

export const LocationContext = createContext<LocationContextValue | null>(null);
