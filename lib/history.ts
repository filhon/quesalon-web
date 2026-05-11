// Requires Firebase RTDB security rules allowing authenticated users to
// read and write to "history/":
//
//   "history": {
//     ".read": "auth != null",
//     ".write": "auth != null"
//   }

import { ref, push, get } from "firebase/database";
import { db } from "./firebase";
import type {
  NFeDoc,
  VerificationHistoryEntry,
  ReportHistoryEntry,
} from "./types";

export async function saveVerificationHistory(
  entry: Omit<VerificationHistoryEntry, "id">,
): Promise<void> {
  await push(ref(db, "history/verifications"), entry);
}

export async function saveReportHistory(
  meta: Omit<ReportHistoryEntry, "id">,
  docs: NFeDoc[],
): Promise<void> {
  await push(ref(db, "history/reports"), {
    ...meta,
    docs: JSON.stringify(docs),
  });
}

export async function getVerificationHistory(): Promise<
  VerificationHistoryEntry[]
> {
  const snap = await get(ref(db, "history/verifications"));
  if (!snap.exists()) return [];

  const entries: VerificationHistoryEntry[] = [];
  snap.forEach((child) => {
    entries.push({ id: child.key!, ...child.val() });
  });
  return entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
}

export async function getReportHistory(): Promise<ReportHistoryEntry[]> {
  const snap = await get(ref(db, "history/reports"));
  if (!snap.exists()) return [];

  const entries: ReportHistoryEntry[] = [];
  snap.forEach((child) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { docs: _docs, ...rest } = child.val() as ReportHistoryEntry & {
      docs: string;
    };
    entries.push({ id: child.key!, ...rest });
  });
  return entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
}

export async function getReportDocs(id: string): Promise<NFeDoc[]> {
  const snap = await get(ref(db, `history/reports/${id}`));
  if (!snap.exists()) throw new Error("Relatório não encontrado");
  const { docs } = snap.val() as { docs: string };
  return JSON.parse(docs) as NFeDoc[];
}
