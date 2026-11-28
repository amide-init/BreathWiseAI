import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
} from 'firebase/firestore';

import { getFirebaseDb } from '@/lib/firebase';
import { getDocFromLocalCache, getDocsFromLocalCache } from '@/lib/firestore-cache';
import {
  buildFamilyCreatePayload,
  buildFamilyUpdatePayload,
  buildMemberCreatePayload,
  buildMemberUpdatePayload,
  mapFirestoreDocToFamilyModel,
  mapFirestoreDocToMemberModel,
  type FamilyMemberModel,
  type FamilyModel,
  type SaveFamilyInput,
  type SaveMemberInput,
} from '@/models/family.model';

const USERS_COLLECTION = 'users';
const FAMILIES_SUBCOLLECTION = 'families';

export async function getCachedUserFamily(
  uid: string,
  defaultFamilyId?: string | null,
): Promise<{ family: FamilyModel | null; members: FamilyMemberModel[] } | null> {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }

  let family: FamilyModel | null = null;
  if (defaultFamilyId) {
    const directSnap = await getDocFromLocalCache(
      doc(db, USERS_COLLECTION, uid, FAMILIES_SUBCOLLECTION, defaultFamilyId),
    );
    if (directSnap && directSnap.exists()) {
      family = mapFirestoreDocToFamilyModel(directSnap.id, directSnap.data());
    }
  }

  if (!family) {
    const q = query(collection(db, USERS_COLLECTION, uid, FAMILIES_SUBCOLLECTION), limit(1));
    const snaps = await getDocsFromLocalCache(q);
    const first = snaps?.docs[0];
    if (first) {
      family = mapFirestoreDocToFamilyModel(first.id, first.data());
    }
  }

  if (!family) {
    return null;
  }

  const membersQuery = query(
    collection(db, USERS_COLLECTION, uid, FAMILIES_SUBCOLLECTION, family.familyId, 'members'),
  );
  const memberSnaps = await getDocsFromLocalCache(membersQuery);
  const members = memberSnaps
    ? memberSnaps.docs.map((d) => mapFirestoreDocToMemberModel(d.id, d.data()))
    : [];

  return { family, members };
}

export async function getUserFamily(
  uid: string,
  defaultFamilyId?: string | null,
): Promise<FamilyModel | null> {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }

  if (defaultFamilyId) {
    const directSnap = await getDoc(
      doc(db, USERS_COLLECTION, uid, FAMILIES_SUBCOLLECTION, defaultFamilyId),
    );
    if (directSnap.exists()) {
      return mapFirestoreDocToFamilyModel(directSnap.id, directSnap.data());
    }
  }

  const q = query(collection(db, USERS_COLLECTION, uid, FAMILIES_SUBCOLLECTION), limit(1));
  const snaps = await getDocs(q);
  const first = snaps.docs[0];
  return first ? mapFirestoreDocToFamilyModel(first.id, first.data()) : null;
}

export async function saveFamilyProfile(
  uid: string,
  input: SaveFamilyInput,
  existingFamilyId?: string | null,
): Promise<FamilyModel> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Cloud Firestore is not configured.');
  }

  if (existingFamilyId) {
    const ref = doc(db, USERS_COLLECTION, uid, FAMILIES_SUBCOLLECTION, existingFamilyId);
    await updateDoc(ref, buildFamilyUpdatePayload(input));
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return mapFirestoreDocToFamilyModel(snap.id, snap.data());
    }
  }

  const createdRef = await addDoc(
    collection(db, USERS_COLLECTION, uid, FAMILIES_SUBCOLLECTION),
    buildFamilyCreatePayload(uid, input),
  );
  const createdSnap = await getDoc(createdRef);
  if (createdSnap.exists()) {
    return mapFirestoreDocToFamilyModel(createdSnap.id, createdSnap.data());
  }
  return {
    familyId: createdRef.id,
    ownerUserId: uid,
    ...input,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function listFamilyMembers(
  uid: string,
  familyId: string,
): Promise<FamilyMemberModel[]> {
  const db = getFirebaseDb();
  if (!db) {
    return [];
  }
  const snaps = await getDocs(
    collection(db, USERS_COLLECTION, uid, FAMILIES_SUBCOLLECTION, familyId, 'members'),
  );
  return snaps.docs.map((d) => mapFirestoreDocToMemberModel(d.id, d.data()));
}

export async function addFamilyMember(
  uid: string,
  familyId: string,
  input: SaveMemberInput,
): Promise<FamilyMemberModel> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Cloud Firestore is not configured.');
  }
  const ref = await addDoc(
    collection(db, USERS_COLLECTION, uid, FAMILIES_SUBCOLLECTION, familyId, 'members'),
    buildMemberCreatePayload(uid, input),
  );
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return mapFirestoreDocToMemberModel(snap.id, snap.data());
  }
  return {
    memberId: ref.id,
    ownerUserId: uid,
    nickname: input.nickname,
    role: input.role,
    ageGroup: input.ageGroup,
    schedule: input.schedule ?? null,
    commuteMode: input.commuteMode ?? null,
    optionalHealthProfile: input.optionalHealthProfile ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateFamilyMember(
  uid: string,
  familyId: string,
  memberId: string,
  input: SaveMemberInput,
): Promise<FamilyMemberModel> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Cloud Firestore is not configured.');
  }
  const ref = doc(
    db,
    USERS_COLLECTION,
    uid,
    FAMILIES_SUBCOLLECTION,
    familyId,
    'members',
    memberId,
  );
  await updateDoc(ref, buildMemberUpdatePayload(input));
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Member document not found after update.');
  }
  return mapFirestoreDocToMemberModel(snap.id, snap.data());
}

export async function deleteFamilyMember(
  uid: string,
  familyId: string,
  memberId: string,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    return;
  }
  await deleteDoc(
    doc(db, USERS_COLLECTION, uid, FAMILIES_SUBCOLLECTION, familyId, 'members', memberId),
  );
}
