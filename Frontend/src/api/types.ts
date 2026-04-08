export type Paged<T> = {
  items: T[];
  total: number;
  skip: number;
  take: number;
};

export type SupporterListItem = {
  supporterId: number;
  name: string;
  email: string;
  lifetimeGiving: number;
  lastGift: string;
  status: string;
};

export type DonationRow = {
  date: string;
  amount: number;
  fund: string;
  method: string;
};

export type SupporterDetail = {
  supporterId: number;
  name: string;
  email: string;
  lifetimeGiving: number;
  lastGift: string;
  status: string;
  acquisitionChannel: string | null;
  region: string | null;
  country: string | null;
  donations: DonationRow[];
};

export type ResidentListItem = {
  residentId: number;
  displayName: string;
  safehouse: string;
  phase: string;
  socialWorker: string;
  updated: string;
};

export type ResidentDetail = {
  residentId: number;
  displayName: string;
  safehouse: string;
  phase: string;
  socialWorker: string;
  updated: string;
  notesRestricted: string | null;
  caseStatus: string | null;
  reintegrationStatus: string | null;
};

export type ProcessRecordingRow = {
  date: string;
  sessionType: string;
  clinician: string;
  duration: string;
  narrative: string | null;
  notesRestricted: string | null;
};

export type VisitationRow = {
  date: string;
  visitorPurpose: string;
  location: string;
  status: string;
};

export type ConferenceRow = {
  date: string;
  title: string;
  attendees: string;
  outcome: string;
};

export type DashboardStat = { value: string; label: string };

export type ActivityItem = {
  id: string;
  label: string;
  detail: string;
  occurredAt: string;
};

export type DashboardResponse = {
  stats: DashboardStat[];
  activity: ActivityItem[];
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

export type DonorProfile = {
  supporterId: number;
  name: string;
  email: string;
  status: string;
  region: string | null;
  country: string | null;
  acquisitionChannel: string | null;
  firstDonationDate: string | null;
  lifetimeGiving: number;
  lastGift: string | null;
  totalGifts: number;
};

export type DonationHistoryItem = {
  donationId: number;
  supporterId: number | null;
  donationType: string | null;
  donationDate: string | null;
  isRecurring: boolean | null;
  campaignName: string | null;
  channelSource: string | null;
  currencyCode: string | null;
  amount: number | null;
  estimatedValue: number | null;
  impactUnit: string | null;
  notes: string | null;
};

export type PublicStatItem = { value: string; label: string };

export type PublicUtilizationItem = { label: string; pct: number };

export type PublicImpactResponse = {
  snapshotId: number | null;
  headline: string | null;
  summaryText: string | null;
  landingStats: PublicStatItem[] | null;
  impactStats: PublicStatItem[] | null;
  utilization: PublicUtilizationItem[] | null;
};
