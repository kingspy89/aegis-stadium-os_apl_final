import { getFirebaseAuth, getFirestoreDb } from "../firebase/admin";

export interface VolunteerRecord {
  volunteerId: string;
  passcode: string;
  displayName: string;
  role: string;
  zone: string | null;
  active: boolean;
}

const fallbackRecords: VolunteerRecord[] = [
  {
    volunteerId: "VOL-1001",
    passcode: "AEGIS-1001",
    displayName: "North Stand Volunteer",
    role: "volunteer",
    zone: "North",
    active: true,
  },
  {
    volunteerId: "VOL-1002",
    passcode: "AEGIS-1002",
    displayName: "South Pavilion Volunteer",
    role: "volunteer",
    zone: "South",
    active: true,
  },
  {
    volunteerId: "VOL-9000",
    passcode: "AEGIS-9000",
    displayName: "Duty Supervisor",
    role: "supervisor",
    zone: null,
    active: true,
  },
];

function getSeedRecords() {
  const raw = process.env.TELEGRAM_VOLUNTEER_DB_JSON;
  if (!raw) return fallbackRecords;

  try {
    const parsed = JSON.parse(raw) as VolunteerRecord[];
    return parsed.filter((record) => record.active !== false);
  } catch {
    return fallbackRecords;
  }
}

const volunteerRecords = getSeedRecords();

const firebaseCollection = process.env.FIREBASE_VOLUNTEERS_COLLECTION || "volunteers";

function normalizeVolunteerId(volunteerId: string) {
  return volunteerId.trim().toUpperCase();
}

function normalizeVolunteerRecord(record: Partial<VolunteerRecord> & { volunteerId?: string }) {
  if (!record.volunteerId) {
    return null;
  }

  const normalizedId = normalizeVolunteerId(record.volunteerId);

  return {
    volunteerId: normalizedId,
    passcode: typeof record.passcode === "string" ? record.passcode.trim() : "",
    displayName: typeof record.displayName === "string" ? record.displayName : normalizedId,
    role: typeof record.role === "string" ? record.role : "volunteer",
    zone: typeof record.zone === "string" && record.zone.trim() ? record.zone.trim() : null,
    active: record.active !== false,
  } satisfies VolunteerRecord;
}

async function loadVolunteerRecordFromFirestore(volunteerId: string) {
  const db = getFirestoreDb();
  if (!db) {
    return null;
  }

  const normalizedId = normalizeVolunteerId(volunteerId);
  const directDoc = await db.collection(firebaseCollection).doc(normalizedId).get().catch(() => null);
  const directData = directDoc?.exists ? directDoc.data() : null;

  if (directData) {
    return normalizeVolunteerRecord({ volunteerId: normalizedId, ...directData });
  }

  const querySnapshot = await db
    .collection(firebaseCollection)
    .where("volunteerId", "==", normalizedId)
    .limit(1)
    .get()
    .catch(() => null);

  const queryData = querySnapshot && !querySnapshot.empty ? querySnapshot.docs[0]?.data() : null;
  if (!queryData) {
    return null;
  }

  return normalizeVolunteerRecord({ volunteerId: normalizedId, ...queryData });
}

async function syncFirebaseAuthProfile(record: VolunteerRecord) {
  const auth = getFirebaseAuth();
  if (!auth) {
    return;
  }

  const claims: Record<string, string | boolean> = {
    role: record.role,
    active: record.active,
  };

  if (record.zone) {
    claims.zone = record.zone;
  }

  try {
    await auth.updateUser(record.volunteerId, {
      displayName: record.displayName,
      disabled: !record.active,
    });
  } catch {
    await auth.createUser({
      uid: record.volunteerId,
      displayName: record.displayName,
      disabled: !record.active,
    });
  }

  try {
    await auth.setCustomUserClaims(record.volunteerId, claims);
  } catch (error) {
    console.warn("[Firebase] Failed to set custom claims for volunteer:", record.volunteerId, error);
  }
}

export async function findVolunteerRecord(volunteerId: string, passcode?: string) {
  const normalizedId = normalizeVolunteerId(volunteerId);
  const normalizedPass = passcode?.trim();

  const firebaseRecord = await loadVolunteerRecordFromFirestore(normalizedId);
  if (firebaseRecord) {
    if (typeof normalizedPass !== "undefined" && firebaseRecord.passcode !== normalizedPass) {
      return null;
    }

    return firebaseRecord.active !== false ? firebaseRecord : null;
  }

  return volunteerRecords.find((record) => {
    const idMatches = record.volunteerId.toUpperCase() === normalizedId;
    const passMatches = typeof normalizedPass === "undefined" || record.passcode === normalizedPass;
    return idMatches && passMatches && record.active !== false;
  }) || null;
}

export async function volunteerIdExists(volunteerId: string) {
  return (await findVolunteerRecord(volunteerId)) !== null;
}

export async function syncVolunteerFirebaseAuth(record: VolunteerRecord) {
  await syncFirebaseAuthProfile(record);
}