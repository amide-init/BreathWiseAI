import { Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { QUICK_PICK_CITIES } from '@/config/cities';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { detectUserGpsLocation } from '@/lib/geolocation';
import { searchLocations } from '@/services/air-quality.service';
import type { LocationOption } from '@/types';

export function LocationPickerModal() {
  const { selectedLocation, isPickerOpen, closePicker, selectLocation } = useSelectedLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationOption[]>([...QUICK_PICK_CITIES]);
  const [searching, setSearching] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  async function handleDetectGps() {
    setLocatingGps(true);
    setGpsError(null);
    try {
      const detected = await detectUserGpsLocation();
      await selectLocation(detected);
    } catch (err) {
      setGpsError(err instanceof Error ? err.message : 'Unable to detect your location.');
    } finally {
      setLocatingGps(false);
    }
  }

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([...QUICK_PICK_CITIES]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const matches = await searchLocations(trimmed);
        setResults(matches);
      } catch {
        const q = trimmed.toLowerCase();
        setResults(
          QUICK_PICK_CITIES.filter(
            (city) =>
              city.city.toLowerCase().includes(q) ||
              city.state.toLowerCase().includes(q) ||
              city.label.toLowerCase().includes(q),
          ),
        );
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, isPickerOpen]);

  if (!isPickerOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Select city"
    >
      <div className="w-full max-w-lg rounded-t-3xl border border-zinc-200/80 bg-white p-5 shadow-2xl sm:rounded-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3 pb-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Select Your City
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Choose a location for real-time CPCB NAQI, pollutants & weather.
            </p>
          </div>
          <button
            type="button"
            onClick={closePicker}
            aria-label="Close location picker"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 space-y-2">
          <button
            type="button"
            disabled={locatingGps}
            onClick={() => void handleDetectGps()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-500/15 disabled:opacity-60 dark:border-emerald-400/35 dark:bg-emerald-400/12 dark:text-emerald-300 dark:hover:bg-emerald-400/20"
          >
            {locatingGps ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
            )}
            {locatingGps ? 'Detecting your area…' : 'Use My Current Location (GPS)'}
          </button>

          {gpsError ? (
            <p className="text-center text-[11px] text-amber-700 dark:text-amber-400">{gpsError}</p>
          ) : null}
        </div>

        <div className="relative mb-4">
          <Search
            className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-zinc-400"
            aria-hidden="true"
          />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any city (e.g. Delhi, Pune, Jaipur)…"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pr-3 pl-9 text-sm text-zinc-950 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-950"
          />
        </div>

        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {searching ? (
            <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Searching locations…
            </p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
              No matching cities found. Try another city name.
            </p>
          ) : (
            results.map((city) => {
              const isSelected = city.locationId === selectedLocation.locationId;
              return (
                <button
                  key={city.locationId}
                  type="button"
                  onClick={() => void selectLocation(city)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100'
                      : 'border-zinc-200/80 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800/80'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <MapPin
                      className={`h-4 w-4 shrink-0 ${
                        isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'
                      }`}
                      aria-hidden="true"
                    />
                    <span>
                      <span className="block text-sm font-medium">{city.city}</span>
                      <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                        {city.label}
                      </span>
                    </span>
                  </span>
                  {isSelected ? (
                    <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-semibold text-white dark:bg-emerald-500 dark:text-zinc-950">
                      Active
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
