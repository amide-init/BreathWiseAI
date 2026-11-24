import { MapPin, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { QUICK_PICK_CITIES } from '@/config/cities';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { searchLocations } from '@/services/air-quality.service';
import type { LocationOption } from '@/types';

export function LocationPickerModal() {
  const { selectedLocation, isPickerOpen, closePicker, selectLocation } = useSelectedLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationOption[]>([...QUICK_PICK_CITIES]);
  const [searching, setSearching] = useState(false);

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Select city"
    >
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Select Your City</h2>
            <p className="text-xs text-slate-500">
              Choose a location for real-time CPCB NAQI, pollutants & weather.
            </p>
          </div>
          <button
            type="button"
            onClick={closePicker}
            aria-label="Close location picker"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mb-4">
          <Search
            className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any city (e.g. Delhi, Pune, Jaipur)…"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-3 pl-9 text-sm text-slate-900 outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
          />
        </div>

        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {searching ? (
            <p className="py-6 text-center text-xs text-slate-500">Searching locations…</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
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
                  className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/70 text-teal-950'
                      : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <MapPin
                      className={`h-4 w-4 shrink-0 ${isSelected ? 'text-teal-700' : 'text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <span>
                      <span className="block text-sm font-medium">{city.city}</span>
                      <span className="block text-xs text-slate-500">{city.label}</span>
                    </span>
                  </span>
                  {isSelected ? (
                    <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-semibold text-white">
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
