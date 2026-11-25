import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import type {
  FamilyMemberModel,
  FamilyModel,
  SaveFamilyInput,
  SaveMemberInput,
} from '@/models/family.model';
import {
  addFamilyMember,
  deleteFamilyMember,
  getUserFamily,
  listFamilyMembers,
  saveFamilyProfile,
  updateFamilyMember,
} from '@/services/family.service';

export interface UseFamilyProfileResult {
  family: FamilyModel | null;
  members: FamilyMemberModel[];
  isLoading: boolean;
  error: string | null;
  saveFamily: (input: SaveFamilyInput) => Promise<FamilyModel>;
  createMember: (input: SaveMemberInput) => Promise<FamilyMemberModel>;
  editMember: (memberId: string, input: SaveMemberInput) => Promise<FamilyMemberModel>;
  removeMember: (memberId: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useFamilyProfile(): UseFamilyProfileResult {
  const { user, userProfile, updateUser } = useAuth();
  const [family, setFamily] = useState<FamilyModel | null>(null);
  const [members, setMembers] = useState<FamilyMemberModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setFamily(null);
      setMembers([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const found = await getUserFamily(user.uid, userProfile?.defaultFamilyId);
      setFamily(found);
      if (found) {
        const list = await listFamilyMembers(user.uid, found.familyId);
        setMembers(list);
      } else {
        setMembers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load family profile.');
    } finally {
      setIsLoading(false);
    }
  }, [user, userProfile?.defaultFamilyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveFamily = useCallback(
    async (input: SaveFamilyInput): Promise<FamilyModel> => {
      if (!user) {
        throw new Error('Sign in required.');
      }
      const saved = await saveFamilyProfile(user.uid, input, family?.familyId);
      setFamily(saved);
      if (userProfile?.defaultFamilyId !== saved.familyId || !userProfile?.onboardingCompleted) {
        await updateUser({
          defaultFamilyId: saved.familyId,
          onboardingCompleted: true,
        });
      }
      return saved;
    },
    [user, family?.familyId, userProfile?.defaultFamilyId, userProfile?.onboardingCompleted, updateUser],
  );

  const createMember = useCallback(
    async (input: SaveMemberInput): Promise<FamilyMemberModel> => {
      if (!user || !family) {
        throw new Error('Save your household profile first before adding family members.');
      }
      const created = await addFamilyMember(user.uid, family.familyId, input);
      setMembers((prev) => [...prev, created]);
      return created;
    },
    [user, family],
  );

  const editMember = useCallback(
    async (memberId: string, input: SaveMemberInput): Promise<FamilyMemberModel> => {
      if (!family) {
        throw new Error('Household profile not found.');
      }
      const updated = await updateFamilyMember(family.familyId, memberId, input);
      setMembers((prev) => prev.map((m) => (m.memberId === memberId ? updated : m)));
      return updated;
    },
    [family],
  );

  const removeMember = useCallback(
    async (memberId: string): Promise<void> => {
      if (!family) {
        return;
      }
      await deleteFamilyMember(family.familyId, memberId);
      setMembers((prev) => prev.filter((m) => m.memberId !== memberId));
    },
    [family],
  );

  return {
    family,
    members,
    isLoading,
    error,
    saveFamily,
    createMember,
    editMember,
    removeMember,
    reload: load,
  };
}
