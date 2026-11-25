import type { User } from 'firebase/auth';
import { createContext } from 'react';

import type { UpdateUserInput, UserModel } from '@/models/user.model';

export interface AuthContextValue {
  user: User | null;
  userProfile: UserModel | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (input: UpdateUserInput) => Promise<UserModel | null>;
  refreshUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
