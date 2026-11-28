import {
  CalendarCheck2,
  Check,
  Loader2,
  LocateFixed,
  MapPin,
  Pencil,
  Search,
  Star,
  Tag,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { ModalPortal } from '@/components/ui/modal-portal';
import { QUICK_PICK_CITIES } from '@/config/cities';
import { useAuth } from '@/hooks/useAuth';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { detectUserGpsLocation } from '@/lib/geolocation';
import { searchLocations } from '@/services/air-quality.service';
import {
  listCachedTodayPlannedLocationIds,
  listTodayPlannedLocationIds,
} from '@/services/planner.service';
import type { LocationOption } from '@/types';

const PRESET_CITY_LABELS = ['My City', 'Home Town', 'Office', 'Parents', 'School'] as const;

export function LocationPickerModal() {
  const { user } = useAuth();
  const {
    selectedLocation,
    selectedLocationNickname,
    savedCities,
    isPickerOpen,
    closePicker,
    selectLocation,
    saveCity,
    removeSavedCity,
  } = useSelectedLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationOption[]>([...QUICK_PICK_CITIES]);
  const [plannedLocationIds, setPlannedLocationIds] = useState<Set<string>>(() => new Set());
  const [togglingPinId, setTogglingPinId] = useState<string | null>(null);
  const [editingCity, setEditingCity] = useState<LocationOption | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Reset inline label editor when modal closes; load today's planned locationIds when opened
  useEffect(() => {
    if (!isPickerOpen) {
      setEditingCity(null);
      setLabelDraft('');
      setLabelError(null);
      return;
    }
    if (!user) {
      return;
    }
    let cancelled = false;
    void listCachedTodayPlannedLocationIds(user.uid).then((cached) => {
      if (!cancelled && cached && cached.length > 0) {
        setPlannedLocationIds(new Set(cached));
      }
    });
    void listTodayPlannedLocationIds(user.uid)
      .then((fresh) => {
        if (!cancelled) {
          setPlannedLocationIds(new Set(fresh));
        }
      })
      .catch(() => {
        // Non-blocking: badge is optional UI polish
      });
    return () => {
      cancelled = true;
    };
  }, [isPickerOpen, user]);

  const savedById = new Map(savedCities.map((c) => [c.locationId, c]));

  function openLabelEditor(city: LocationOption) {
    const existing = savedById.get(city.locationId);
    setEditingCity(city);
    setLabelDraft(existing?.nickname ?? '');
    setLabelError(null);
  }

  async function handleSaveLabel(nextLabel?: string | null) {
    if (!user || !editingCity || savingLabel) {
      return;
    }
    const cleaned = (nextLabel !== undefined ? nextLabel : labelDraft)?.trim().slice(0, 40) || null;
    setSavingLabel(true);
    setLabelError(null);
    try {
      await saveCity(editingCity, cleaned);
      setEditingCity(null);
      setLabelDraft('');
    } catch {
      setLabelError('Could not save city label. Please try again.');
    } finally {
      setSavingLabel(false);
    }
  }

  async function handleTogglePin(city: LocationOption) {
    if (!user || togglingPinId) {
      return;
    }
    const alreadyPinned = savedById.has(city.locationId);
    setTogglingPinId(city.locationId);
    try {
      if (alreadyPinned) {
        await removeSavedCity(city.locationId);
        if (editingCity?.locationId === city.locationId) {
          setEditingCity(null);
        }
      } else {
        await saveCity(city);
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
                  Choose, pin, or label cities (like “My City” or “Home Town”).
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

            {/* Currently Active City Card — always visible so user can label/pin even custom/GPS cities */}
            <div className="mb-3 rounded-2xl border border-[#4285F4]/35 bg-[#E8F0FE]/60 px-3.5 py-2.5 dark:border-[#8AB4F8]/30 dark:bg-[#4285F4]/12">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#174EA6] dark:text-[#8AB4F8]">
                      Current City
                    </span>
                    {selectedLocationNickname ? (
                      <span
                        data-no-translate="true"
                        className="rounded-full bg-[#1A73E8] px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-[#8AB4F8] dark:text-[#131314]"
                      >
                        {selectedLocationNickname}
                      </span>
                    ) : null}
                    {plannedLocationIds.has(selectedLocation.locationId) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#34A853]/15 px-2 py-0.5 text-[10px] font-semibold text-[#137333] dark:bg-[#81C995]/20 dark:text-[#81C995]">
                        <CalendarCheck2 className="h-2.5 w-2.5" aria-hidden="true" />
                        Plan ready
                      </span>
                    ) : null}
                  </div>
                  <p
                    data-no-translate="true"
                    className="truncate text-sm font-semibold text-[#202124] dark:text-[#E3E3E3]"
                  >
                    {selectedLocation.city}
                  </p>
                  <p
                    data-no-translate="true"
                    className="truncate text-[11px] text-[#5F6368] dark:text-[#9AA0A6]"
                  >
                    {selectedLocation.label}
                  </p>
                </div>

                {user ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openLabelEditor(selectedLocation)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#4285F4]/40 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1A73E8] hover:bg-[#F8FAFF] dark:border-[#8AB4F8]/35 dark:bg-[#1E1F20] dark:text-[#8AB4F8] dark:hover:bg-white/10"
                    >
                      <Tag className="h-3 w-3" aria-hidden="true" />
                      {selectedLocationNickname ? 'Edit Label' : 'Set Label'}
                    </button>
                    <button
                      type="button"
                      disabled={togglingPinId === selectedLocation.locationId}
                      onClick={() => void handleTogglePin(selectedLocation)}
                      aria-label={
                        savedById.has(selectedLocation.locationId)
                          ? `Remove ${selectedLocation.city} from saved cities`
                          : `Save ${selectedLocation.city}`
                      }
                      className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-transparent bg-white/80 transition-colors dark:bg-[#1E1F20] ${
                        savedById.has(selectedLocation.locationId)
                          ? 'text-[#FBBC05] hover:bg-white'
                          : 'text-[#9AA0A6] hover:text-[#FBBC05]'
                      }`}
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${savedById.has(selectedLocation.locationId) ? 'fill-current' : ''}`}
                      />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Inline Custom City Label Editor */}
            {user && editingCity ? (
              <div className="mb-3 rounded-2xl border border-[#4285F4]/35 bg-[#F8FAFF] p-3 dark:border-[#8AB4F8]/30 dark:bg-[#131314]">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#174EA6] dark:text-[#D2E3FC]">
                    <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="truncate">
                      Label for <span data-no-translate="true">{editingCity.city}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingCity(null)}
                    aria-label="Close label editor"
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[#5F6368] hover:bg-black/5 dark:text-[#9AA0A6] dark:hover:bg-white/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mb-2 flex flex-wrap gap-1.5">
                  {PRESET_CITY_LABELS.map((preset) => {
                    const active = labelDraft.trim().toLowerCase() === preset.toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setLabelDraft(preset)}
                        className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                          active
                            ? 'border-[#4285F4] bg-[#4285F4] text-white dark:border-[#8AB4F8] dark:bg-[#8AB4F8] dark:text-[#131314]'
                            : 'border-[#DADCE0] bg-white text-[#3C4043] hover:border-[#4285F4]/50 dark:border-white/[0.12] dark:bg-[#1E1F20] dark:text-[#E3E3E3]'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSaveLabel();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    maxLength={40}
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    placeholder="Custom label (e.g. My City, Home Town)…"
                    className="min-w-0 flex-1 rounded-xl border border-[#DADCE0] bg-white px-3 py-1.5 text-xs text-[#202124] outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 dark:border-white/[0.14] dark:bg-[#1E1F20] dark:text-[#E3E3E3] dark:placeholder:text-[#9AA0A6]"
                  />
                  {savedById.get(editingCity.locationId)?.nickname ? (
                    <button
                      type="button"
                      disabled={savingLabel}
                      onClick={() => void handleSaveLabel(null)}
                      className="cursor-pointer rounded-xl border border-[#DADCE0] px-2.5 py-1.5 text-xs font-medium text-[#5F6368] hover:bg-black/5 disabled:opacity-50 dark:border-white/[0.12] dark:text-[#9AA0A6] dark:hover:bg-white/10"
                    >
                      Clear
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    disabled={savingLabel}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-[#1A73E8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1765CC] disabled:opacity-60 dark:bg-[#8AB4F8] dark:text-[#131314] dark:hover:bg-[#A8C7FA]"
                  >
                    {savingLabel ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Save
                  </button>
                </form>

                {labelError ? (
                  <p className="mt-1.5 text-[11px] text-[#C5221F] dark:text-[#F28B82]">
                    {labelError}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* User's Saved / Labeled Cities (users/{uid}/saved_cities) */}
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
                          className="inline-flex max-w-[190px] cursor-pointer items-center gap-1 truncate"
                        >
                          <span className="truncate">
                            {city.nickname ? `${city.nickname} · ${city.city}` : city.city}
                          </span>
                          {plannedLocationIds.has(city.locationId) ? (
                            <CalendarCheck2
                              className="h-3 w-3 shrink-0 text-[#1E8E3E] dark:text-[#81C995]"
                              aria-label="Today's plan ready"
                            />
                          ) : null}
                        </button>
                        <button
                          type="button"
                          aria-label={`Edit label for ${city.city}`}
                          title={`Label ${city.city} (e.g. My City, Home Town)`}
                          onClick={() => openLabelEditor(city)}
                          className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-[#5F6368] hover:bg-black/5 hover:text-[#1A73E8] dark:text-[#9AA0A6] dark:hover:bg-white/10 dark:hover:text-[#8AB4F8]"
                        >
                          <Pencil className="h-2.5 w-2.5" />
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
                  const savedEntry = savedById.get(city.locationId);
                  const isPinned = Boolean(savedEntry);
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
                          <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                            <span className="truncate">{city.city}</span>
                            {savedEntry?.nickname ? (
                              <span className="shrink-0 rounded-full bg-[#4285F4]/12 px-2 py-0.5 text-[10px] font-semibold text-[#1A73E8] dark:bg-[#8AB4F8]/18 dark:text-[#8AB4F8]">
                                {savedEntry.nickname}
                              </span>
                            ) : null}
                            {plannedLocationIds.has(city.locationId) ? (
                              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#34A853]/12 px-1.5 py-0.5 text-[10px] font-semibold text-[#137333] dark:bg-[#81C995]/18 dark:text-[#81C995]">
                                <CalendarCheck2 className="h-2.5 w-2.5" aria-hidden="true" />
                                Plan
                              </span>
                            ) : null}
                          </span>
                          <span className="block truncate text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                            {city.label}
                          </span>
                        </span>
                      </button>

                      <div className="flex shrink-0 items-center gap-1">
                        {isSelected ? (
                          <span className="rounded-full bg-[#4285F4] px-2.5 py-0.5 text-[10px] font-semibold text-white">
                            Active
                          </span>
                        ) : null}
                        {user ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openLabelEditor(city)}
                              aria-label={`Set label for ${city.city}`}
                              title="Set custom label (e.g. My City, Home Town)"
                              className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors ${
                                savedEntry?.nickname
                                  ? 'text-[#1A73E8] hover:bg-black/5 dark:text-[#8AB4F8] dark:hover:bg-white/10'
                                  : 'text-[#9AA0A6] hover:bg-black/5 hover:text-[#1A73E8] dark:hover:bg-white/10 dark:hover:text-[#8AB4F8]'
                              }`}
                            >
                              <Tag className="h-3.5 w-3.5" />
                            </button>
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
                          </>
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
