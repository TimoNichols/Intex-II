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
  displayName?: string;
  displayCode?: string;
  caseControlNo?: string | null;
  internalCode?: string | null;
  safehouse: string;
  phase?: string;
  caseStatus?: string | null;
  caseCategory?: string | null;
  socialWorker?: string;
  assignedSocialWorker?: string | null;
  updated?: string;
  admissionDate?: string | null;
  currentRiskLevel?: string | null;
  reintegrationStatus?: string | null;
};

export type ResidentDetail = {
  residentId: number;
  displayName?: string;
  displayCode?: string;
  caseControlNo?: string | null;
  internalCode?: string | null;
  safehouse: string;
  safehouseId?: number | null;
  phase?: string;
  socialWorker?: string;
  assignedSocialWorker?: string | null;
  updated?: string;
  dateOfAdmission?: string | null;
  notesRestricted?: string | null;
  caseStatus?: string | null;
  caseCategory?: string | null;
  reintegrationStatus?: string | null;
  currentRiskLevel?: string | null;
  referralSource?: string | null;
  referringAgencyPerson?: string | null;
  initialCaseAssessment?: string | null;
  reintegrationType?: string | null;
  initialRiskLevel?: string | null;
  subCatOrphaned?: boolean | null;
  subCatTrafficked?: boolean | null;
  subCatChildLabor?: boolean | null;
  subCatPhysicalAbuse?: boolean | null;
  subCatSexualAbuse?: boolean | null;
  subCatOsaec?: boolean | null;
  subCatCicl?: boolean | null;
  subCatAtRisk?: boolean | null;
  subCatStreetChild?: boolean | null;
  subCatChildWithHiv?: boolean | null;
  familyIs4ps?: boolean | null;
  familySoloParent?: boolean | null;
  familyIndigenous?: boolean | null;
  familyParentPwd?: boolean | null;
  familyInformalSettler?: boolean | null;
};

export type ProcessRecordingRow = {
  recordingId?: number;
  date?: string;
  sessionDate?: string | null;
  sessionType?: string | null;
  clinician?: string;
  socialWorker?: string | null;
  duration?: string;
  sessionDurationMinutes?: number | null;
  emotionalStateObserved?: string | null;
  emotionalStateEnd?: string | null;
  narrative?: string | null;
  sessionNarrative?: string | null;
  interventionsApplied?: string | null;
  followUpActions?: string | null;
  progressNoted?: boolean | null;
  notesRestricted?: string | null;
  concernsFlagged?: boolean | null;
  referralMade?: boolean | null;
};

export type VisitationRow = {
  visitationId?: number;
  date?: string;
  visitDate?: string | null;
  visitorPurpose?: string;
  visitType?: string | null;
  location?: string;
  locationVisited?: string | null;
  status?: string;
  visitOutcome?: string | null;
  safetyConcernsNoted?: boolean | null;
};

export type ConferenceRow = {
  planId?: number;
  date?: string;
  caseConferenceDate?: string | null;
  targetDate?: string | null;
  title?: string;
  planCategory?: string | null;
  attendees?: string;
  servicesProvided?: string | null;
  outcome?: string;
  status?: string | null;
};

export type SafehouseOption = {
  safehouseId: number;
  name: string;
  city?: string | null;
  region?: string | null;
  status?: string | null;
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
  supporterId?: number | null;
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

// ---------------------------------------------------------------------------
// ML Prediction types
// ---------------------------------------------------------------------------

export type DonorChurnPrediction = {
  supporterId: number;
  displayName: string;
  churnProbability: number;
  riskLabel: "High" | "Medium" | "Low";
};

export type ReintegrationPrediction = {
  residentId: number;
  readinessScore: number;
  readinessLabel: "Ready" | "In Progress" | "Needs Support";
};

export type SocialPostInput = {
  platform: string;
  postType: string;
  mediaType: string;
  sentimentTone: string;
  contentTopic: string;
  postHour: number;
  dayOfWeek: string;
  isBoosted: 0 | 1;
  numHashtags: number;
  hasCallToAction: 0 | 1;
  featuresResidentStory: 0 | 1;
  captionLength: number;
  engagementRate: number;
};

export type SocialPostPrediction = {
  predictedDonationValue: number;
  topRecommendations: string[];
};

export type AuthMeResponse = {
  userId: string | null;
  email: string | null;
  displayName: string | null;
  roles: string[];
};

export type PublicStatItem = { value: string; label: string };

export type PublicUtilizationItem = { label: string; pct: number };

export type LandingHero = {
  eyebrow: string | null;
  titleLine1: string | null;
  titleEmphasis: string | null;
  sub: string | null;
};

export type MissionSection = {
  sectionLabel: string | null;
  heading: string | null;
  subtitle: string | null;
};

export type MissionCard = {
  title: string;
  description: string;
  iconKey: string | null;
};

export type JourneySection = {
  sectionLabel: string | null;
  heading: string | null;
  subtitle: string | null;
};

export type JourneyStep = { title: string; desc: string };

export type Testimonial = { quote: string; attribution: string | null };

export type PublicImpactResponse = {
  snapshotId: number | null;
  headline: string | null;
  summaryText: string | null;
  landingStats: PublicStatItem[] | null;
  impactStats: PublicStatItem[] | null;
  utilization: PublicUtilizationItem[] | null;
  landingHero: LandingHero | null;
  missionSection: MissionSection | null;
  missionCards: MissionCard[] | null;
  journeySection: JourneySection | null;
  journeySteps: JourneyStep[] | null;
  testimonial: Testimonial | null;
  programTags: string[] | null;
  trustStrip: string[] | null;
};
