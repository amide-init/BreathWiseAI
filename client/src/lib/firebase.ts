import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

import { env, isFirebaseConfigured } from '@/config/env';

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let emulatorsConnected = false;

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
    if (env.useEmulators && !emulatorsConnected) {
      connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
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
    dbInstance = getFirestore(app);
    if (env.useEmulators && !emulatorsConnected) {
      connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080);
      emulatorsConnected = true;
    }
  }
  return dbInstance;
}
