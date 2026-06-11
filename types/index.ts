import type {
  Organization,
  User,
  UserOrganization,
  Member,
  MembershipPlan,
  Resource,
  Location,
  Booking,
  Invoice,
  Visitor,
  Announcement,
  Event,
  UserRole,
  Plan,
  ResourceType,
  MemberStatus,
  BookingStatus,
  InvoiceStatus,
  PlanType,
  BillingCycle,
} from "@prisma/client";

// Re-export Prisma enums for convenience
export {
  UserRole,
  Plan,
  ResourceType,
  MemberStatus,
  BookingStatus,
  InvoiceStatus,
  PlanType,
  BillingCycle,
};

// ── Extended types with relations ─────────────────────────────────────────────

export type OrganizationWithUsers = Organization & {
  users: (UserOrganization & { user: User })[];
};

export type MemberWithUser = Member & {
  user: User;
  membershipPlan: MembershipPlan | null;
};

export type MemberWithDetails = Member & {
  user: User;
  membershipPlan: MembershipPlan | null;
  bookings: Booking[];
  invoices: Invoice[];
};

export type ResourceWithLocation = Resource & {
  location: Location;
};

export type BookingWithDetails = Booking & {
  resource: ResourceWithLocation;
  member: MemberWithUser | null;
  user: User;
};

export type InvoiceWithMember = Invoice & {
  member: MemberWithUser;
};

// ── Session / Auth types ──────────────────────────────────────────────────────

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
};

export type SessionContext = {
  user: SessionUser;
  organizationId: string;
  role: UserRole;
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: Plan;
    currency: string;
    timezone: string;
    jurisdiction: "UAE" | "KSA";
    trialEndsAt: Date | null;
    platformSubscriptionStatus: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED" | null;
  };
};

// ── API response types ────────────────────────────────────────────────────────

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type ApiError = {
  error: string;
  code?: string;
};

// ── Dashboard / Analytics types ───────────────────────────────────────────────

export type KPIData = {
  revenue: {
    current: number;
    previous: number;
    currency: string;
  };
  activeMembers: {
    current: number;
    previous: number;
  };
  todayBookings: {
    total: number;
    pending: number;
  };
  occupancyRate: {
    current: number;
    previous: number;
  };
};

export type RevenueDataPoint = {
  date: string;
  revenue: number;
};

export type OccupancyDataPoint = {
  resourceName: string;
  occupancyRate: number;
  totalBookings: number;
};

// ── Invoice line item ─────────────────────────────────────────────────────────

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

// ── Form types ────────────────────────────────────────────────────────────────

export type BookingFormValues = {
  resourceId: string;
  memberId: string;
  startTime: Date;
  endTime: Date;
  title?: string;
  description?: string;
  attendees?: number;
};

export type ResourceFormValues = {
  name: string;
  type: ResourceType;
  locationId: string;
  description?: string;
  capacity: number;
  hourlyRate?: number;
  halfDayRate?: number;
  fullDayRate?: number;
  amenities: string[];
  requiresApproval: boolean;
  advanceBookingDays: number;
  minBookingMinutes: number;
  maxBookingHours: number;
};

export type MemberFormValues = {
  name: string;
  email: string;
  company?: string;
  jobTitle?: string;
  bio?: string;
  phone?: string;
  membershipPlanId?: string;
};

export type InvoiceFormValues = {
  memberId: string;
  lineItems: InvoiceLineItem[];
  dueDate: Date;
  notes?: string;
  currency: string;
  sendImmediately: boolean;
};
