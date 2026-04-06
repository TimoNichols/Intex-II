/** Placeholder records until API wiring. */

export type DonorRow = {
  id: string;
  name: string;
  email: string;
  lifetimeGiving: number;
  lastGift: string;
  status: 'Active' | 'Lapsed' | 'Major';
};

export type ResidentRow = {
  id: string;
  displayName: string;
  safehouse: string;
  phase: 'Intake' | 'Active care' | 'Reintegration' | 'Alumni';
  socialWorker: string;
  updated: string;
};

export const mockDonors: DonorRow[] = [
  { id: 'd-1042', name: 'Elena Marquez', email: 'elena.m@example.com', lifetimeGiving: 12400, lastGift: '2026-03-12', status: 'Major' },
  { id: 'd-1041', name: 'James & Priya Shah', email: 'giving@shah.family', lifetimeGiving: 8200, lastGift: '2026-02-28', status: 'Active' },
  { id: 'd-1038', name: 'Northside Rotary', email: 'treasurer@northside-rotary.org', lifetimeGiving: 45000, lastGift: '2025-12-01', status: 'Major' },
  { id: 'd-1035', name: 'Anonymous (check)', email: '—', lifetimeGiving: 2500, lastGift: '2026-01-15', status: 'Active' },
  { id: 'd-1029', name: 'Harbor Community Foundation', email: 'grants@hcf.org', lifetimeGiving: 180000, lastGift: '2025-11-20', status: 'Major' },
  { id: 'd-1011', name: 'Morgan Ellis', email: 'morgan.ellis@example.com', lifetimeGiving: 640, lastGift: '2024-08-03', status: 'Lapsed' },
];

export const mockResidents: ResidentRow[] = [
  { id: 'r-2201', displayName: 'Initials A.K.', safehouse: 'North Harbor', phase: 'Active care', socialWorker: 'Sam Okonkwo', updated: '2026-04-02' },
  { id: 'r-2198', displayName: 'Initials M.T.', safehouse: 'Lakeside', phase: 'Reintegration', socialWorker: 'Jordan Lee', updated: '2026-03-30' },
  { id: 'r-2194', displayName: 'Initials L.R.', safehouse: 'North Harbor', phase: 'Intake', socialWorker: 'Sam Okonkwo', updated: '2026-04-05' },
  { id: 'r-2188', displayName: 'Initials S.V.', safehouse: 'Riverside', phase: 'Active care', socialWorker: 'Alex Rivera', updated: '2026-03-18' },
  { id: 'r-2175', displayName: 'Initials J.P.', safehouse: 'Lakeside', phase: 'Alumni', socialWorker: 'Jordan Lee', updated: '2025-12-10' },
];

export const mockActivity = [
  { id: '1', label: 'New intake completed', detail: 'Resident r-2194 — North Harbor', time: '2h ago' },
  { id: '2', label: 'Gift received', detail: '$500 from Elena Marquez', time: '5h ago' },
  { id: '3', label: 'Conference scheduled', detail: 'r-2198 — MDT review Apr 8', time: 'Yesterday' },
  { id: '4', label: 'Report exported', detail: 'Q1 utilization (PDF)', time: 'Yesterday' },
];

export const mockStaffUsers = [
  { id: 'u-1', name: 'Alex Rivera', email: 'arivera@harbor.dev', role: 'Case Manager', status: 'Active' },
  { id: 'u-2', name: 'Sam Okonkwo', email: 'sokonkwo@harbor.dev', role: 'Lead Social Worker', status: 'Active' },
  { id: 'u-3', name: 'Jordan Lee', email: 'jlee@harbor.dev', role: 'Case Manager', status: 'Active' },
  { id: 'u-4', name: 'Taylor Kim', email: 'tkim@harbor.dev', role: 'Read-only', status: 'Invited' },
];

export function getDonorById(id: string | undefined) {
  return mockDonors.find((d) => d.id === id);
}

export function getResidentById(id: string | undefined) {
  return mockResidents.find((r) => r.id === id);
}

export const dashboardStats = [
  { value: '47', label: 'Active residents' },
  { value: '128', label: 'Donors this year' },
  { value: '$1.02M', label: 'YTD program funds' },
  { value: '12', label: 'Open MDT actions' },
] as const;
