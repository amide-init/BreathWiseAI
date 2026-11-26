import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { dedupeFetch, getCached, setCached } from '@/lib/client-cache';
import type {
  FamilyMemberModel,
  FamilyModel,
  SaveFamilyInput,
  SaveMemberInput,
} from '@/models/family.model';
import {
  addFamilyMember,
  deleteFamilyMember,
  getCachedUserFamily,
  getUserFamily,
  listFamilyMembers,
  saveFamilyProfile,
  updateFamilyMember,
} from '@/services/family.service';

const FAMILY_CACHE_TTL_MS = 10 * 60 * 1000;

interface FamilyBundle {
  family: FamilyModel | null;
  members: FamilyMemberModel[];
}

function familyCacheKey(uid: string): string {
  return `family:${uid}`;
}

export interface UseFamilyProfileResult {
  family: FamilyModel | null;
  members: FamilyMemberModel[];
  isLoading: boolean;
  error: string | null;
  saveFamily: (input: SaveFamilyInput) => Promise<FamilyModel>;
  createMember: (input: SaveMemberInput, targetFamilyId?: string) => Promise<FamilyMemberModel>;
  editMember: (memberId: string, input: SaveMemberInput) => Promise<FamilyMemberModel>;
  removeMember: (memberId: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useFamilyProfile(): UseFamilyProfileResult {
  const { user, userProfile, updateUser } = useAuth();
  const initialCache = user ? getCached<FamilyBundle>(familyCacheKey(user.uid)) : null;

  const [family, setFamily] = useState<FamilyModel | null>(initialCache?.value.family ?? null);
  const [members, setMembers] = useState<FamilyMemberModel[]>(initialCache?.value.members ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialCache);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (forceServer = false) => {
      if (!user) {
        setFamily(null);
        setMembers([]);
        setIsLoading(false);
        return;
      }

      const key = familyCacheKey(user.uid);
      const memHit = getCached<FamilyBundle>(key);
      let renderedFromCache = false;

      if (!forceServer && memHit) {
        setFamily(memHit.value.family);
        setMembers(memHit.value.members);
        setIsLoading(false);
        setError(null);
        renderedFromCache = true;
        if (memHit.isFresh) {
          return;
        }
      } else if (!forceServer) {
        setIsLoading(true);
        const localHit = await getCachedUserFamily(user.uid, userProfile?.defaultFamilyId);
        if (localHit) {
          setFamily(localHit.family);
          setMembers(localHit.members);
          setIsLoading(false);
          renderedFromCache = true;
        }
      }

      setError(null);
      try {
        const bundle = await dedupeFetch(`fetch:${key}`, async (): Promise<FamilyBundle> => {
          const found = await getUserFamily(user.uid, userProfile?.defaultFamilyId);
          const list = found ? await listFamilyMembers(user.uid, found.familyId) : [];
          return { family: found, members: list };
        });
        setCached(key, bundle, FAMILY_CACHE_TTL_MS);
        setFamily(bundle.family);
        setMembers(bundle.members);
      } catch (err) {
        if (!renderedFromCache) {
          setError(err instanceof Error ? err.message : 'Unable to load family profile.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [user, userProfile?.defaultFamilyId],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const saveFamily = useCallback(
    async (input: SaveFamilyInput): Promise<FamilyModel> => {
      if (!user) {
        throw new Error('Sign in required.');
      }
      const saved = await saveFamilyProfile(user.uid, input, family?.familyId);
      setFamily(saved);
      setCached(familyCacheKey(user.uid), { family: saved, members }, FAMILY_CACHE_TTL_MS);
      if (userProfile?.defaultFamilyId !== saved.familyId || !userProfile?.onboardingCompleted) {
        await updateUser({
          defaultFamilyId: saved.familyId,
          onboardingCompleted: true,
        });
      }
      return saved;
    },
    [
      user,
      family?.familyId,
      members,
      userProfile?.defaultFamilyId,
      userProfile?.onboardingCompleted,
      updateUser,
    ],
  );

  const createMember = useCallback(
    async (input: SaveMemberInput, targetFamilyId?: string): Promise<FamilyMemberModel> => {
      const resolvedFamilyId = targetFamilyId ?? family?.familyId;
      if (!user || !resolvedFamilyId) {
        throw new Error('Save your household profile first before adding family members.');
      }
      const created = await addFamilyMember(user.uid, resolvedFamilyId, input);
      setMembers((prev) => {
        const next = [...prev, created];
        const currentFamily =
          family ?? getCached<FamilyBundle>(familyCacheKey(user.uid))?.value.family ?? null;
        if (currentFamily) {
          setCached(
            familyCacheKey(user.uid),
            { family: currentFamily, members: next },
            FAMILY_CACHE_TTL_MS,
          );
        }
        return next;
      });
      return created;
    },
    [user, family],
  );

  const editMember = useCallback(
    async (memberId: string, input: SaveMemberInput): Promise<FamilyMemberModel> => {
      if (!user || !family) {
        throw new Error('Household profile not found.');
      }
      const updated = await updateFamilyMember(family.familyId, memberId, input);
      setMembers((prev) => {
        const next = prev.map((m) => (m.memberId === memberId ? updated : m));
        setCached(familyCacheKey(user.uid), { family, members: next }, FAMILY_CACHE_TTL_MS);
        return next;
      });
      return updated;
    },
    [user, family],
  );

  const removeMember = useCallback(
    async (memberId: string): Promise<void> => {
      if (!user || !family) {
        return;
      }
      await deleteFamilyMember(family.familyId, memberId);
      setMembers((prev) => {
        const next = prev.filter((m) => m.memberId !== memberId);
        setCached(familyCacheKey(user.uid), { family, members: next }, FAMILY_CACHE_TTL_MS);
        return next;
      });
    },
    [user, family],
  );

  const reload = useCallback(() => load(true), [load]);

  return {
    family,
    members,
    isLoading,
    error,
    saveFamily,
    createMember,
    editMember,
    removeMember,
    reload,
  };
}
