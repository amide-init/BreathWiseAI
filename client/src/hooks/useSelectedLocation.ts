import { useContext } from 'react';

import { LocationContext, type LocationContextValue } from '@/context/location-context';

export function useSelectedLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useSelectedLocation must be used within a LocationProvider.');
  }
  return ctx;
}
