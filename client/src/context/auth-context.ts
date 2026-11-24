import type { User } from 'firebase/auth';
import { createContext } from 'react';

import type { UserProfileRecord } from '@/services/user.service';

export interface AuthContextValue {
  user: User | null;
  userProfile: UserProfileRecord | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
