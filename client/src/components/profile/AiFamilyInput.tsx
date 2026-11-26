import { Check, Loader2, Sparkles, UserPlus, X } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AGE_GROUP_LABELS, ROLE_LABELS, TRANSPORT_LABELS } from '@/models/family.model';
import {
  parseHouseholdDescription,
  type ParsedHouseholdDraft,
} from '@/services/profile-ai.service';

const EXAMPLE_PROMPTS = [
  'Me, wife, and 7yo son with mild dust allergy; I ride a scooter 15 km, we light dhoop daily, and have no purifier.',
  'Living with my 68yo dad who walks early morning; I drive 20 km, someone smokes on the balcony, we have a kitchen chimney.',
  'Solo working adult working from home, morning runner, LPG kitchen with exhaust, no HEPA purifier.',
];

interface AiFamilyInputProps {
  onApplyDraft: (draft: ParsedHouseholdDraft) => Promise<void> | void;
  submitLabel?: string;
  compact?: boolean;
}

/**
 * Natural-language AI household setup composer:
 * Lets users describe their family & real home habits in one casual sentence,
 * previews extracted members & habits as minimal editable chips, and saves in 1 tap.
 */
export function AiFamilyInput({
  onApplyDraft,
  submitLabel = 'Save Household & Family',
  compact = false,
}: AiFamilyInputProps) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [draft, setDraft] = useState<ParsedHouseholdDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleParse(inputText?: string) {
    const query = (inputText ?? text).trim();
    if (query.length < 4) {
      setError('Type a short sentence about who lives with you and your home/commute.');
      return;
    }
    setParsing(true);
    setError(null);
    try {
      const parsed = await parseHouseholdDescription(query);
      setDraft(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to parse description right now.');
    } finally {
      setParsing(false);
    }
  }

  function removeMember(index: number) {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      const next = prev.members.filter((_, idx) => idx !== index);
      return { ...prev, members: next };
    });
  }

  function toggleHabit(
    key: 'hasHepaPurifier' | 'hasKitchenExhaust' | 'indoorSmokingPresent' | 'incenseOrDhoopDaily',
  ) {
    setDraft((prev) => (prev ? { ...prev, [key]: !prev[key] } : prev));
  }

  async function handleConfirm() {
    if (!draft) {
      return;
    }
    setApplying(true);
    setError(null);
    try {
      await onApplyDraft(draft);
      setDraft(null);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save parsed household.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-3.5">
      <div className="cloud-card rounded-3xl border border-white/80 bg-white/95 p-4 backdrop-blur-sm dark:border-white/[0.09] dark:bg-[#1E1F20]/95">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#4285F4]/14 text-[#1A73E8] dark:bg-[#8AB4F8]/18 dark:text-[#8AB4F8]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-[#202124] dark:text-[#E3E3E3]">
                Describe your family &amp; home in 1 sentence
              </p>
              {!compact ? (
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                  Skip the long form — mention family members, commute, purifier, smoking, or daily
                  dhoop honestly.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <textarea
          rows={compact ? 2 : 3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && text.trim().length >= 4 && !parsing) {
              e.preventDefault();
              void handleParse();
            }
          }}
          placeholder="e.g., Me, wife, 8yo daughter with dust allergies, dad 68; scooter 14 km, smoking on balcony, no air purifier…"
          className="w-full resize-none rounded-2xl border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-colors placeholder:text-[#9AA0A6] focus:border-[#4285F4] focus:bg-white focus:ring-2 focus:ring-[#4285F4]/20 dark:border-white/[0.12] dark:bg-[#131314] dark:text-[#E3E3E3] dark:placeholder:text-[#9AA0A6] dark:focus:border-[#8AB4F8]"
        />

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_PROMPTS.slice(0, compact ? 2 : 3).map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setText(sample);
                  void handleParse(sample);
                }}
                className="cursor-pointer rounded-full border border-[#DADCE0] bg-[#F8F9FA] px-3 py-1 text-[11px] font-medium text-[#3C4043] transition-colors hover:border-[#4285F4]/50 hover:bg-[#E8F0FE]/60 hover:text-[#1A73E8] dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-[#C4C7C5] dark:hover:border-[#8AB4F8]/50 dark:hover:text-[#8AB4F8]"
              >
                Try example {idx + 1}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="brand"
            size="sm"
            disabled={parsing || text.trim().length < 4}
            onClick={() => void handleParse()}
          >
            {parsing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {parsing ? 'Understanding…' : 'Auto-Fill with AI'}
          </Button>
        </div>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {draft ? (
        <div className="cloud-card space-y-4 rounded-3xl border border-[#4285F4]/30 bg-[#E8F0FE]/55 p-4 dark:border-[#8AB4F8]/25 dark:bg-[#4285F4]/[0.1]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-[#1A73E8] dark:text-[#8AB4F8]">
                AI Preview · Tap any chip to tweak before saving
              </p>
              <p className="mt-0.5 text-xs text-[#3C4043] dark:text-[#C4C7C5]">
                {draft.summaryNote}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDraft(null)}
              aria-label="Discard AI preview"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[#5F6368] hover:bg-white/70 hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:bg-white/[0.08] dark:hover:text-[#E3E3E3]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Extracted Members */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6368] dark:text-[#9AA0A6]">
              Household Members ({draft.members.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {draft.members.map((member, idx) => (
                <div
                  key={`${member.nickname}-${idx}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[#DADCE0] bg-white px-3 py-1.5 text-xs dark:border-white/[0.1] dark:bg-[#1E1F20]"
                >
                  <UserPlus className="h-3.5 w-3.5 text-[#34A853] dark:text-[#81C995]" />
                  <span className="font-semibold text-[#202124] dark:text-[#E3E3E3]">
                    {member.nickname}
                  </span>
                  <span className="text-[#5F6368] dark:text-[#9AA0A6]">
                    {ROLE_LABELS[member.role]} · {AGE_GROUP_LABELS[member.ageGroup]}
                  </span>
                  {member.hasRespiratorySensitivity ? (
                    <Badge variant="warning">Sensitive lungs</Badge>
                  ) : null}
                  {draft.members.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeMember(idx)}
                      aria-label={`Remove ${member.nickname}`}
                      className="cursor-pointer text-[#5F6368] hover:text-[#EA4335] dark:text-[#9AA0A6] dark:hover:text-[#F28B82]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Extracted Commute & Honest Home Habits (click to toggle!) */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6368] dark:text-[#9AA0A6]">
              Commute &amp; Home Conditions (tap to toggle)
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="neutral">
                {TRANSPORT_LABELS[draft.primaryCommuteMode]} · {draft.dailyCommuteKm} km/day
              </Badge>
              <button
                type="button"
                onClick={() => toggleHabit('hasHepaPurifier')}
                className="cursor-pointer"
              >
                <Badge variant={draft.hasHepaPurifier ? 'default' : 'outline'}>
                  {draft.hasHepaPurifier ? 'HEPA purifier: Yes' : 'No HEPA purifier'}
                </Badge>
              </button>
              <button
                type="button"
                onClick={() => toggleHabit('hasKitchenExhaust')}
                className="cursor-pointer"
              >
                <Badge variant={draft.hasKitchenExhaust ? 'default' : 'outline'}>
                  {draft.hasKitchenExhaust ? 'Kitchen exhaust: Yes' : 'No kitchen exhaust'}
                </Badge>
              </button>
              <button
                type="button"
                onClick={() => toggleHabit('indoorSmokingPresent')}
                className="cursor-pointer"
              >
                <Badge variant={draft.indoorSmokingPresent ? 'warning' : 'outline'}>
                  {draft.indoorSmokingPresent ? 'Smoking present (harm-reduction on)' : 'Smoke-free'}
                </Badge>
              </button>
              <button
                type="button"
                onClick={() => toggleHabit('incenseOrDhoopDaily')}
                className="cursor-pointer"
              >
                <Badge variant={draft.incenseOrDhoopDaily ? 'warning' : 'outline'}>
                  {draft.incenseOrDhoopDaily ? 'Daily incense/dhoop' : 'No daily incense'}
                </Badge>
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="brand"
              size="sm"
              disabled={applying}
              onClick={() => void handleConfirm()}
            >
              {applying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {applying ? 'Saving…' : submitLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
