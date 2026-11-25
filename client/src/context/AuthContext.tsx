import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { AuthContext, type AuthContextValue } from '@/context/auth-context';
import { getFirebaseAuth } from '@/lib/firebase';
import type { UpdateUserInput, UserModel } from '@/models/user.model';
import {
  ensureUserDocument,
  getUserById,
  updateUserProfile,
} from '@/services/user.service';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const profile = await ensureUserDocument(nextUser);
          setUserProfile(profile);
        } catch {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Auth is not configured.');
    }
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error('Firebase Auth is not configured.');
      }
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const cleanName = displayName.trim().slice(0, 100);
      if (cleanName) {
        await updateProfile(cred.user, { displayName: cleanName });
      }
      try {
        const profile = await ensureUserDocument(cred.user);
        setUserProfile(profile);
      } catch {
        // Firestore sync retries on next auth state event
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Auth is not configured.');
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  }, []);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      return;
    }
    await firebaseSignOut(auth);
  }, []);

  const updateUser = useCallback(
    async (input: UpdateUserInput): Promise<UserModel | null> => {
      if (!user) {
        throw new Error('You must be signed in to update your profile.');
      }
      // Guarantee document exists before updating
      await ensureUserDocument(user);
      const updated = await updateUserProfile(user.uid, input);
      if (updated) {
        setUserProfile(updated);
      }
      if (input.displayName && input.displayName.trim() !== user.displayName) {
        await updateProfile(user, { displayName: input.displayName.trim().slice(0, 100) });
      }
      return updated;
    },
    [user],
  );

  const refreshUserProfile = useCallback(async () => {
    if (!user) {
      return;
    }
    const latest = await getUserById(user.uid);
    setUserProfile(latest);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      userProfile,
      isLoading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      updateUser,
      refreshUserProfile,
    }),
    [
      user,
      userProfile,
      isLoading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      updateUser,
      refreshUserProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
