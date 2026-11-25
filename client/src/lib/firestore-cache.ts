import {
  getDoc,
  getDocFromCache,
  getDocs,
  getDocsFromCache,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';

/**
 * Attempts to read a single document strictly from Firestore's local IndexedDB cache.
 * Returns `null` on cache miss or when offline persistence is unavailable.
 */
export async function getDocFromLocalCache<T = DocumentData>(
  ref: DocumentReference<T>,
): Promise<DocumentSnapshot<T> | null> {
  try {
    const snap = await getDocFromCache(ref);
    return snap.exists() ? snap : null;
  } catch {
    return null;
  }
}

/**
 * Cache-first single document fetch: returns local IndexedDB snapshot immediately if present,
 * otherwise fetches from Firestore server (which also populates the local cache).
 */
export async function getDocCacheFirst<T = DocumentData>(
  ref: DocumentReference<T>,
): Promise<DocumentSnapshot<T>> {
  const cached = await getDocFromLocalCache(ref);
  if (cached) {
    return cached;
  }
  return getDoc(ref);
}

/**
 * Attempts to read query results strictly from Firestore's local IndexedDB cache.
 * Returns `null` when cache has no matching documents or persistence is unavailable.
 */
export async function getDocsFromLocalCache<T = DocumentData>(
  q: Query<T>,
): Promise<QuerySnapshot<T> | null> {
  try {
    const snap = await getDocsFromCache(q);
    return snap.empty ? null : snap;
  } catch {
    return null;
  }
}

/**
 * Cache-first query fetch: returns non-empty local IndexedDB results immediately if cached,
 * otherwise queries Firestore server.
 */
export async function getDocsCacheFirst<T = DocumentData>(
  q: Query<T>,
): Promise<QuerySnapshot<T>> {
  const cached = await getDocsFromLocalCache(q);
  if (cached) {
    return cached;
  }
  return getDocs(q);
}
