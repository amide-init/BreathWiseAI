import { getAI, GoogleAIBackend, type AI } from 'firebase/ai';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';
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
let appCheckInstance: AppCheck | null = null;
let aiInstance: AI | null = null;
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

/**
 * Initializes Firebase App Check when `VITE_FIREBASE_RECAPTCHA_SITE_KEY` is configured.
 * In local development, enables the auto-generated debug token so localhost works seamlessly.
 */
export function ensureFirebaseAppCheck(app: FirebaseApp): AppCheck | null {
  if (appCheckInstance || !env.recaptchaSiteKey || typeof window === 'undefined') {
    return appCheckInstance;
  }
  try {
    if (import.meta.env.DEV) {
      const globalSelf = globalThis as typeof globalThis & {
        FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
      };
      if (globalSelf.FIREBASE_APPCHECK_DEBUG_TOKEN === undefined) {
        globalSelf.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
    }
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(env.recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    // Non-blocking: App Check may already be initialized across Vite HMR reloads
  }
  return appCheckInstance;
}

/**
 * Returns the lazily initialized Firebase AI Logic client (`GoogleAIBackend`),
 * used strictly for lightweight client-side form auto-fill helpers.
 */
export function getFirebaseAI(): AI | null {
  const app = getFirebaseApp();
  if (!app || !env.enableClientAiLogic) {
    return null;
  }
  ensureFirebaseAppCheck(app);
  if (!aiInstance) {
    aiInstance = getAI(app, { backend: new GoogleAIBackend() });
  }
  return aiInstance;
}
