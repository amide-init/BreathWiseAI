import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';

import { callFunction } from '@/lib/callable-client';
import { getFirebaseDb } from '@/lib/firebase';
import { getDocsFromLocalCache } from '@/lib/firestore-cache';
import type {
  ChatMessageItem,
  ChatSessionSummary,
  SendChatMessageResponse,
} from '@/models/chat.model';
import type { Citation, CurrentAirQuality, LocationOption } from '@/types';

const SESSIONS_COLLECTION = 'chat_sessions';

function serializeTs(value: unknown): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return typeof value === 'string' ? value : null;
}

export async function listCachedUserChatSessions(uid: string): Promise<ChatSessionSummary[] | null> {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where('userId', '==', uid),
    orderBy('updatedAt', 'desc'),
    limit(15),
  );
  const snap = await getDocsFromLocalCache(q);
  if (!snap) {
    return null;
  }
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      sessionId: d.id,
      title: typeof data.title === 'string' ? data.title : 'Clean-Air Conversation',
      locationId: typeof data.locationId === 'string' ? data.locationId : null,
      updatedAt: serializeTs(data.updatedAt),
    };
  });
}

export async function listCachedSessionMessages(
  uid: string,
  sessionId: string,
): Promise<ChatMessageItem[] | null> {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }
  const q = query(
    collection(db, SESSIONS_COLLECTION, sessionId, 'messages'),
    where('userId', '==', uid),
    limit(50),
  );
  const snap = await getDocsFromLocalCache(q);
  if (!snap) {
    return null;
  }
  const messages = snap.docs.map((d) => {
    const data = d.data();
    return {
      messageId: d.id,
      sessionId,
      role: data.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: typeof data.content === 'string' ? data.content : '',
      createdAt: serializeTs(data.createdAt),
      citations: Array.isArray(data.citations) ? (data.citations as Citation[]) : [],
      followUpSuggestions: Array.isArray(data.followUpSuggestions)
        ? (data.followUpSuggestions as string[])
        : [],
      environmentalSnapshot:
        data.environmentalSnapshot && typeof data.environmentalSnapshot === 'object'
          ? (data.environmentalSnapshot as CurrentAirQuality)
          : null,
      medicalEscalationRequired: Boolean(data.medicalEscalationRequired),
      fallbackMode: Boolean(data.fallbackMode),
    };
  });
  return messages.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
}

export async function sendChatMessage(params: {
  location: LocationOption;
  message: string;
  sessionId?: string | null;
  familyId?: string | null;
}): Promise<SendChatMessageResponse> {
  return callFunction<Record<string, unknown>, SendChatMessageResponse>('send_chat_message', {
    locationId: params.location.locationId,
    lat: params.location.lat,
    lng: params.location.lng,
    label: params.location.label,
    message: params.message,
    sessionId: params.sessionId ?? null,
    familyId: params.familyId ?? null,
  });
}

export async function listUserChatSessions(uid: string): Promise<ChatSessionSummary[]> {
  const db = getFirebaseDb();
  if (!db) {
    return [];
  }
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where('userId', '==', uid),
    orderBy('updatedAt', 'desc'),
    limit(15),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      sessionId: d.id,
      title: typeof data.title === 'string' ? data.title : 'Clean-Air Conversation',
      locationId: typeof data.locationId === 'string' ? data.locationId : null,
      updatedAt: serializeTs(data.updatedAt),
    };
  });
}

export async function listSessionMessages(
  uid: string,
  sessionId: string,
): Promise<ChatMessageItem[]> {
  const db = getFirebaseDb();
  if (!db) {
    return [];
  }
  const q = query(
    collection(db, SESSIONS_COLLECTION, sessionId, 'messages'),
    where('userId', '==', uid),
    limit(50),
  );
  const snap = await getDocs(q);
  const messages = snap.docs.map((d) => {
    const data = d.data();
    return {
      messageId: d.id,
      sessionId,
      role: data.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: typeof data.content === 'string' ? data.content : '',
      createdAt: serializeTs(data.createdAt),
      citations: Array.isArray(data.citations) ? (data.citations as Citation[]) : [],
      followUpSuggestions: Array.isArray(data.followUpSuggestions)
        ? (data.followUpSuggestions as string[])
        : [],
      environmentalSnapshot:
        data.environmentalSnapshot && typeof data.environmentalSnapshot === 'object'
          ? (data.environmentalSnapshot as CurrentAirQuality)
          : null,
      medicalEscalationRequired: Boolean(data.medicalEscalationRequired),
      fallbackMode: Boolean(data.fallbackMode),
    };
  });
  return messages.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    return;
  }
  await deleteDoc(doc(db, SESSIONS_COLLECTION, sessionId));
}
