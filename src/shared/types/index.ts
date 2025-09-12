// User & Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  dealershipId?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  DEALER_ADMIN = 'dealer_admin',
  MANAGER = 'manager',
  SALES_REP = 'sales_rep',
  SERVICE_ADVISOR = 'service_advisor',
  VIEWER = 'viewer'
}

// Dealership Types
export interface Dealership {
  id: string;
  name: string;
  address: DealershipAddress;
  phone: string;
  website?: string;
  brands: string[];
  timezone: string;
  isActive: boolean;
  subscription: SubscriptionPlan;
  settings: DealershipSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface DealershipAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface DealershipSettings {
  businessHours: BusinessHours;
  voiceSettings: VoiceSettings;
  crmIntegration?: CRMIntegration;
  privacySettings: PrivacySettings;
  features: FeatureFlags;
}

export interface BusinessHours {
  [key: string]: { open: string; close: string; closed?: boolean };
}

// Voice AI Types
export interface VoiceSettings {
  enabled: boolean;
  primaryLanguage: string;
  supportedLanguages: string[];
  recordingNotice: string;
  maxCallDuration: number;
  agents: VoiceAgent[];
}

export interface VoiceAgent {
  id: string;
  name: string;
  type: AgentType;
  phoneNumbers: string[];
  prompt: string;
  knowledgeBase: KnowledgeBaseItem[];
  isActive: boolean;
}

export enum AgentType {
  RECEPTION = 'reception',
  SALES = 'sales',
  SERVICE = 'service',
  PARTS = 'parts',
  AFTER_HOURS = 'after_hours'
}

export interface KnowledgeBaseItem {
  id: string;
  type: 'text' | 'url' | 'file';
  title: string;
  content?: string;
  url?: string;
  fileUrl?: string;
}

// Call & Analytics Types
export interface VoiceCall {
  id: string;
  dealershipId: string;
  agentId: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  duration: number;
  transcript: string;
  summary: string;
  intent: string;
  entities: CallEntity[];
  sentiment: 'positive' | 'neutral' | 'negative';
  wasHandled: boolean;
  transferredTo?: string;
  followUpRequired: boolean;
  recordingUrl?: string;
  createdAt: Date;
}

export interface CallEntity {
  type: string;
  value: string;
  confidence: number;
}

export interface AnalyticsMetrics {
  dealershipId: string;
  period: DatePeriod;
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  averageCallDuration: number;
  customerSatisfaction: number;
  leadConversion: number;
  appointmentsScheduled: number;
  topIntents: IntentMetric[];
  callVolume: TimeSeriesData[];
  sentimentTrend: TimeSeriesData[];
}

export interface IntentMetric {
  intent: string;
  count: number;
  percentage: number;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
}

// Pricing & ROI Types
export interface PricingTier {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  features: PricingFeature[];
  limits: PricingLimits;
  isPopular?: boolean;
}

export interface PricingFeature {
  name: string;
  description: string;
  included: boolean;
}

export interface PricingLimits {
  maxCalls: number;
  maxUsers: number;
  maxAgents: number;
  storageGB: number;
}

export interface ROICalculation {
  dealershipId: string;
  inputs: ROIInputs;
  results: ROIResults;
  calculatedAt: Date;
}

export interface ROIInputs {
  currentStaffingCost: number;
  averageCallVolume: number;
  missedCallRate: number;
  averageDealProfit: number;
  conversionRate: number;
  implementationCost: number;
  monthlySubscription: number;
}

export interface ROIResults {
  monthlyROI: number;
  yearlyROI: number;
  paybackPeriod: number;
  costSavings: number;
  revenueIncrease: number;
  efficiency: EfficiencyMetrics;
}

export interface EfficiencyMetrics {
  timesSaved: number;
  capacityIncrease: number;
  errorReduction: number;
}

// CRM Integration Types
export interface CRMIntegration {
  type: CRMType;
  isActive: boolean;
  credentials: CRMCredentials;
  syncSettings: CRMSyncSettings;
  lastSync?: Date;
}

export enum CRMType {
  HUBSPOT = 'hubspot',
  SALESFORCE = 'salesforce',
  PIPEDRIVE = 'pipedrive',
  ZOHO = 'zoho',
  DEALERCENTER = 'dealercenter'
}

export interface CRMCredentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  instanceUrl?: string;
  refreshToken?: string;
}

export interface CRMSyncSettings {
  syncCalls: boolean;
  syncLeads: boolean;
  syncAppointments: boolean;
  syncContacts: boolean;
  frequency: 'realtime' | 'hourly' | 'daily';
}

// Subscription & Billing Types
export interface SubscriptionPlan {
  tier: PricingTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  usage: UsageMetrics;
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  TRIALING = 'trialing'
}

export interface UsageMetrics {
  callsUsed: number;
  storageUsed: number;
  usersCount: number;
  agentsCount: number;
}

// Utility Types
export interface DatePeriod {
  start: Date;
  end: Date;
}

export interface PrivacySettings {
  dataRetentionDays: number;
  zeroRetentionMode: boolean;
  recordingConsent: boolean;
  gdprCompliant: boolean;
}

export interface FeatureFlags {
  voiceAI: boolean;
  analytics: boolean;
  pricingModule: boolean;
  roiCalculator: boolean;
  crmIntegration: boolean;
  multiLanguage: boolean;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// WebSocket Event Types
export interface SocketEvent {
  type: string;
  data: any;
  dealershipId?: string;
  userId?: string;
}

export interface CallStatusUpdate {
  callId: string;
  status: 'started' | 'ended' | 'transferred';
  duration?: number;
  summary?: string;
}