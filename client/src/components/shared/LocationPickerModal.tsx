import { Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ModalPortal } from '@/components/ui/modal-portal';
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
    <ModalPortal>
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Select city"
    >
      <div className="cloud-card w-full max-w-lg overflow-hidden rounded-t-3xl border border-white/80 bg-white sm:rounded-3xl dark:border-white/[0.1] dark:bg-[#1E1F20]">
        <div className="google-ribbon h-[3px] w-full" aria-hidden="true" />
        <div className="p-5">
        <div className="flex items-center justify-between gap-3 pb-3">
          <div>
            <h2 className="font-display text-base font-bold tracking-tight text-[#202124] dark:text-[#E3E3E3]">
              Select Your City
            </h2>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              Choose a location for real-time CPCB NAQI, pollutants &amp; weather.
            </p>
          </div>
          <button
            type="button"
            onClick={closePicker}
            aria-label="Close location picker"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#5F6368] hover:bg-[#F1F3F4] dark:text-[#9AA0A6] dark:hover:bg-white/[0.08]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 space-y-2">
          <button
            type="button"
            disabled={locatingGps}
            onClick={() => void handleDetectGps()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[#4285F4]/35 bg-[#4285F4]/10 px-3.5 py-2.5 text-xs font-semibold text-[#1A73E8] transition-colors hover:bg-[#4285F4]/15 disabled:opacity-60 dark:border-[#8AB4F8]/35 dark:bg-[#8AB4F8]/12 dark:text-[#8AB4F8] dark:hover:bg-[#8AB4F8]/20"
          >
            {locatingGps ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
            )}
            {locatingGps ? 'Detecting your area…' : 'Use My Current Location (GPS)'}
          </button>

          {gpsError ? (
            <p className="text-center text-[11px] text-[#B06000] dark:text-[#FDD663]">{gpsError}</p>
          ) : null}
        </div>

        <div className="relative mb-4">
          <Search
            className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[#5F6368] dark:text-[#9AA0A6]"
            aria-hidden="true"
          />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any city (e.g. Delhi, Pune, Jaipur)…"
            className="w-full rounded-xl border border-[#DADCE0] bg-[#F8F9FA] py-2.5 pr-3 pl-9 text-sm text-[#202124] outline-none focus:border-[#4285F4] focus:bg-white focus:ring-2 focus:ring-[#4285F4]/25 dark:border-white/[0.12] dark:bg-[#131314] dark:text-[#E3E3E3] dark:placeholder:text-[#9AA0A6] dark:focus:border-[#8AB4F8] dark:focus:bg-[#131314]"
          />
        </div>

        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {searching ? (
            <p className="py-6 text-center text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              Searching locations…
            </p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#5F6368] dark:text-[#9AA0A6]">
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
                      ? 'border-[#4285F4]/50 bg-[#E8F0FE] text-[#174EA6] dark:border-[#8AB4F8]/45 dark:bg-[#4285F4]/15 dark:text-[#D2E3FC]'
                      : 'border-[#E8EAED] bg-white text-[#202124] hover:bg-[#F8F9FA] dark:border-white/[0.08] dark:bg-[#131314]/80 dark:text-[#E3E3E3] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <MapPin
                      className={`h-4 w-4 shrink-0 ${
                        isSelected ? 'text-[#4285F4] dark:text-[#8AB4F8]' : 'text-[#5F6368] dark:text-[#9AA0A6]'
                      }`}
                      aria-hidden="true"
                    />
                    <span>
                      <span className="block text-sm font-medium">{city.city}</span>
                      <span className="block text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                        {city.label}
                      </span>
                    </span>
                  </span>
                  {isSelected ? (
                    <span className="rounded-full bg-[#4285F4] px-2.5 py-0.5 text-[10px] font-semibold text-white">
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
    </div>
    </ModalPortal>
  );
}
