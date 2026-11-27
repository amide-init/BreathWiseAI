/**
 * Validated public client configuration (VITE_* only).
 * Never place server secrets in client environment variables.
 */

export const env = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'agentora-ai-v2',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  },
  functionsRegion: import.meta.env.VITE_FUNCTIONS_REGION ?? 'asia-south1',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, ''),
  useEmulators: import.meta.env.VITE_USE_EMULATORS === 'true',
  aiLogicModel: import.meta.env.VITE_FIREBASE_AI_MODEL ?? 'gemini-3.5-flash-lite',
  enableClientAiLogic: import.meta.env.VITE_ENABLE_CLIENT_AI_LOGIC !== 'false',
  recaptchaSiteKey: import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY ?? '',
} as const;

export const isFirebaseConfigured = Boolean(
  env.firebase.apiKey && env.firebase.projectId && env.firebase.appId,
);
