import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';

import { env, isFirebaseConfigured } from '@/config/env';

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;
let functionsEmulatorConnected = false;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) {
    return null;
  }
  if (!appInstance) {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(env.firebase);
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }
  if (!authInstance) {
    authInstance = getAuth(app);
    if (env.useEmulators && !authEmulatorConnected) {
      connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
      authEmulatorConnected = true;
    }
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }
  if (!dbInstance) {
    try {
      dbInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // Fallback when already initialized (Vite HMR) or when IndexedDB is unavailable (private mode)
      try {
        dbInstance = getFirestore(app);
      } catch {
        dbInstance = initializeFirestore(app, { localCache: memoryLocalCache() });
      }
    }
    if (env.useEmulators && !firestoreEmulatorConnected) {
      connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080);
      firestoreEmulatorConnected = true;
    }
  }
  return dbInstance;
}

export function getFirebaseFunctions(): Functions | null {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }
  if (!functionsInstance) {
    functionsInstance = getFunctions(app, env.functionsRegion);
    if (env.useEmulators && !functionsEmulatorConnected) {
      connectFunctionsEmulator(functionsInstance, '127.0.0.1', 5001);
      functionsEmulatorConnected = true;
    }
  }
  return functionsInstance;
}
