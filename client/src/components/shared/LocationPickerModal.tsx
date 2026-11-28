import { Loader2, LocateFixed, MapPin, Search, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ModalPortal } from '@/components/ui/modal-portal';
import { QUICK_PICK_CITIES } from '@/config/cities';
import { useAuth } from '@/hooks/useAuth';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { detectUserGpsLocation } from '@/lib/geolocation';
import { searchLocations } from '@/services/air-quality.service';
import {
  listCachedSavedCities,
  listSavedCities,
  removeUserCity,
  saveUserCity,
  type SavedCityModel,
} from '@/services/saved-cities.service';
import type { LocationOption } from '@/types';

export function LocationPickerModal() {
  const { user } = useAuth();
  const { selectedLocation, isPickerOpen, closePicker, selectLocation } = useSelectedLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationOption[]>([...QUICK_PICK_CITIES]);
  const [savedCities, setSavedCities] = useState<SavedCityModel[]>([]);
  const [togglingPinId, setTogglingPinId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Load user's pinned cities under users/{uid}/saved_cities whenever modal opens
  useEffect(() => {
    if (!isPickerOpen || !user) {
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
        // Non-blocking: quick-pick and live search still work
      });
    return () => {
      cancelled = true;
    };
  }, [isPickerOpen, user]);

  async function handleTogglePin(city: LocationOption) {
    if (!user || togglingPinId) {
      return;
    }
    const alreadyPinned = savedCities.some((c) => c.locationId === city.locationId);
    setTogglingPinId(city.locationId);
    try {
      if (alreadyPinned) {
        await removeUserCity(user.uid, city.locationId);
        setSavedCities((prev) => prev.filter((c) => c.locationId !== city.locationId));
      } else {
        const saved = await saveUserCity(user.uid, city);
        setSavedCities((prev) => [
          saved,
          ...prev.filter((c) => c.locationId !== saved.locationId),
        ]);
      }
    } catch {
      // Ignore transient Firestore error on optional pin action
    } finally {
      setTogglingPinId(null);
    }
  }

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

  const pinnedIds = new Set(savedCities.map((c) => c.locationId));

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
                  Choose or pin cities for real-time CPCB NAQI, pollutants &amp; weather.
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
                <p className="text-center text-[11px] text-[#B06000] dark:text-[#FDD663]">
                  {gpsError}
                </p>
              ) : null}
            </div>

            {/* User's Saved / Pinned Cities (users/{uid}/saved_cities) */}
            {user && savedCities.length > 0 ? (
              <div className="mb-3 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6368] dark:text-[#9AA0A6]">
                  Saved Cities
                </p>
                <div className="flex flex-wrap gap-1.5" data-no-translate="true">
                  {savedCities.map((city) => {
                    const isSelected = city.locationId === selectedLocation.locationId;
                    return (
                      <div
                        key={city.locationId}
                        className={`inline-flex items-center gap-1 rounded-full border py-1 pr-1.5 pl-3 text-xs transition-colors ${
                          isSelected
                            ? 'border-[#4285F4]/50 bg-[#E8F0FE] font-semibold text-[#174EA6] dark:border-[#8AB4F8]/45 dark:bg-[#4285F4]/20 dark:text-[#D2E3FC]'
                            : 'border-[#DADCE0] bg-[#F8F9FA] text-[#3C4043] hover:border-[#4285F4]/40 dark:border-white/[0.1] dark:bg-[#131314] dark:text-[#E3E3E3]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => void selectLocation(city)}
                          className="cursor-pointer truncate max-w-[160px]"
                        >
                          {city.nickname ? `${city.nickname} · ${city.city}` : city.city}
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${city.city} from saved cities`}
                          disabled={togglingPinId === city.locationId}
                          onClick={() => void handleTogglePin(city)}
                          className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-[#FBBC05] hover:bg-black/5 dark:hover:bg-white/10"
                        >
                          <Star className="h-3 w-3 fill-current" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

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
                  const isPinned = pinnedIds.has(city.locationId);
                  return (
                    <div
                      key={city.locationId}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors ${
                        isSelected
                          ? 'border-[#4285F4]/50 bg-[#E8F0FE] text-[#174EA6] dark:border-[#8AB4F8]/45 dark:bg-[#4285F4]/15 dark:text-[#D2E3FC]'
                          : 'border-[#E8EAED] bg-white text-[#202124] hover:bg-[#F8F9FA] dark:border-white/[0.08] dark:bg-[#131314]/80 dark:text-[#E3E3E3] dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => void selectLocation(city)}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
                      >
                        <MapPin
                          className={`h-4 w-4 shrink-0 ${
                            isSelected
                              ? 'text-[#4285F4] dark:text-[#8AB4F8]'
                              : 'text-[#5F6368] dark:text-[#9AA0A6]'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0" data-no-translate="true">
                          <span className="block truncate text-sm font-medium">{city.city}</span>
                          <span className="block truncate text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                            {city.label}
                          </span>
                        </span>
                      </button>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {isSelected ? (
                          <span className="rounded-full bg-[#4285F4] px-2.5 py-0.5 text-[10px] font-semibold text-white">
                            Active
                          </span>
                        ) : null}
                        {user ? (
                          <button
                            type="button"
                            disabled={togglingPinId === city.locationId}
                            onClick={() => void handleTogglePin(city)}
                            aria-label={
                              isPinned
                                ? `Remove ${city.city} from saved cities`
                                : `Save ${city.city}`
                            }
                            className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors ${
                              isPinned
                                ? 'text-[#FBBC05] hover:bg-black/5 dark:hover:bg-white/10'
                                : 'text-[#9AA0A6] hover:bg-black/5 hover:text-[#FBBC05] dark:hover:bg-white/10'
                            }`}
                          >
                            <Star className={`h-3.5 w-3.5 ${isPinned ? 'fill-current' : ''}`} />
                          </button>
                        ) : null}
                      </div>
                    </div>
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
