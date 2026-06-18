import { z } from "zod";

// ── Booking validations ───────────────────────────────────────────────────────

const createBookingBaseSchema = z.object({
  resourceId: z.string().min(1, "Resource is required"),
  memberId: z.string().optional(),
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  attendees: z.number().int().min(1).max(500).default(1),
  externalGuests: z.array(z.string().email()).optional().default([]),
  // Recurring support
  recurring: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).default("NONE"),
  recurringUntil: z.coerce.date().optional(),
});

export const createBookingSchema = createBookingBaseSchema
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  })
  .refine(
    (data) => {
      const diffMs = data.endTime.getTime() - data.startTime.getTime();
      const diffMins = diffMs / 60000;
      return diffMins >= 30;
    },
    { message: "Minimum booking duration is 30 minutes", path: ["endTime"] }
  )
  .refine(
    (data) => data.recurring === "NONE" || !!data.recurringUntil,
    { message: "Please set an end date for recurring bookings", path: ["recurringUntil"] }
  )
  .refine(
    (data) => !data.recurringUntil || data.recurringUntil > data.startTime,
    { message: "Repeat until must be after the start time", path: ["recurringUntil"] }
  );

export const updateBookingSchema = createBookingBaseSchema.partial().extend({
  status: z
    .enum(["PENDING", "CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"])
    .optional(),
  cancelReason: z.string().max(500).optional(),
});

export const availabilityQuerySchema = z.object({
  resourceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

// ── Resource validations ──────────────────────────────────────────────────────

export const createResourceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum([
    "HOT_DESK",
    "DEDICATED_DESK",
    "PRIVATE_OFFICE",
    "MEETING_ROOM",
    "EVENT_SPACE",
    "PHONE_BOOTH",
    "PODCAST_ROOM",
    "OTHER",
  ]),
  locationId: z.string().min(1, "Location is required"),
  description: z.string().max(1000).optional(),
  capacity: z.number().int().min(1).max(1000).default(1),
  hourlyRate: z.number().min(0).max(10000).optional(),
  halfDayRate: z.number().min(0).max(10000).optional(),
  fullDayRate: z.number().min(0).max(10000).optional(),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.string().url()).default([]),
  requiresApproval: z.boolean().default(false),
  advanceBookingDays: z.number().int().min(1).max(365).default(30),
  minBookingMinutes: z.number().int().min(15).max(480).default(30),
  maxBookingHours: z.number().int().min(1).max(24).default(8),
});

export const updateResourceSchema = createResourceSchema.partial();

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;

// ── Member validations ────────────────────────────────────────────────────────

export const inviteMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email is required"),
  company: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  membershipPlanId: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const updateMemberSchema = inviteMemberSchema.partial().extend({
  bio: z.string().max(500).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]).optional(),
  endDate: z.coerce.date().optional(),
  // GCC fields
  whatsAppNumber: z.string().max(20).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  passportNumber: z.string().max(50).optional().nullable(),
  emiratesId: z.string().max(20).optional().nullable(),
  iqamaNumber: z.string().max(10).optional().nullable(),
  visaExpiry: z.coerce.date().optional().nullable(),
});

export const adjustCreditsSchema = z.object({
  delta: z.number().int(),
  reason: z.string().max(200).optional(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type AdjustCreditsInput = z.infer<typeof adjustCreditsSchema>;

// ── Invoice validations ───────────────────────────────────────────────────────

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(200),
  quantity: z.number().min(1).max(10000),
  unitPrice: z.number().min(0).max(100000),
  total: z.number().min(0),
});

export const createInvoiceSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "At least one line item is required"),
  dueDate: z.coerce.date(),
  notes: z.string().max(1000).optional(),
  currency: z.string().length(3).default("AED"),
  sendImmediately: z.boolean().default(false),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

// ── Organization validations ──────────────────────────────────────────────────

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional().or(z.literal("")),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
  logo: z.string().url().optional(),
  // GCC — UAE TRN (15 digits) or KSA VAT number (15 digits); nullable to clear
  taxRegistrationNumber: z.string().max(30).optional().nullable(),
  // Multi-location (Module 11) — allow members to book at any location
  allowCrossLocationBooking: z.boolean().optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

// ── Membership plan validations ───────────────────────────────────────────────

export const createPlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(["DAY_PASS", "HOT_DESK", "DEDICATED_DESK", "PRIVATE_OFFICE", "VIRTUAL_OFFICE", "CUSTOM"]),
  price: z.number().min(0).max(100000),
  billingCycle: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
  includedCredits: z.number().int().min(0).default(0),
  meetingRoomHours: z.number().int().min(0).default(0),
  features: z.array(z.string().max(100)).default([]),
});

export const updatePlanSchema = createPlanSchema.partial();

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

// ── Auth validations ──────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Registration only captures credentials. Org name, jurisdiction, city, phone,
// resources, plans, and payments are all collected by the onboarding wizard
// (/onboarding) and submitted via POST /api/onboarding/complete.
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number"
    ),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and a number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
