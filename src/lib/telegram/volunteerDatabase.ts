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

export function findVolunteerRecord(volunteerId: string, passcode?: string) {
  const normalizedId = volunteerId.trim().toUpperCase();
  const normalizedPass = passcode?.trim();

  return volunteerRecords.find((record) => {
    const idMatches = record.volunteerId.toUpperCase() === normalizedId;
    const passMatches = typeof normalizedPass === "undefined" || record.passcode === normalizedPass;
    return idMatches && passMatches && record.active !== false;
  }) || null;
}

export function volunteerIdExists(volunteerId: string) {
  return findVolunteerRecord(volunteerId) !== null;
}