import { z } from "zod";

export const applicationSubmitSchema = z.object({
  officeSlug: z.string().min(1).max(100),
  jobSlug: z.string().min(1).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().min(10).max(20),
  captchaToken: z.string().min(1),
  honeypot: z.string().max(0).optional(),
  customFields: z.record(z.string()).optional(),
});

export const bookSlotSchema = z.object({
  slotStart: z.string().datetime(),
  applicantTimezone: z.string().min(1).max(64),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1),
  /** Hidden field; bots that fill it are rejected. */
  honeypot: z.string().max(0).optional(),
  /** Visible decoy — ignored for real sign-in. */
  username: z.string().max(200).optional(),
});

export const officeUpsertSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  timezone: z.string().min(1).max(64),
  locationLabel: z.string().min(1).max(500),
  active: z.boolean().optional(),
});

export const jobUpsertSchema = z
  .object({
    officeId: z.number().int().positive(),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    title: z.string().min(1).max(200),
    active: z.boolean().optional(),
    payMinHourly: z.number().min(0).max(999).nullable().optional(),
    payMaxHourly: z.number().min(0).max(999).nullable().optional(),
    formFields: z.array(z.any()).optional(),
    pageContent: z.record(z.any()).optional(),
  })
  .refine(
    (d) => {
      const min = d.payMinHourly;
      const max = d.payMaxHourly;
      if (min == null || max == null) return true;
      return min <= max;
    },
    { message: "payMinHourly must be <= payMaxHourly" }
  );

export const templateUpsertSchema = z.object({
  templateKey: z.string().min(1).max(100),
  channel: z.enum(["email", "sms"]),
  scope: z.enum(["global", "office", "job"]),
  scopeId: z.number().int().positive().nullable(),
  subject: z.string().max(500).optional(),
  body: z.string().min(1),
});

export const availabilityRuleSchema = z.object({
  scope: z.enum(["global", "office", "job"]),
  scopeId: z.number().int().positive().nullable(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const scheduleConfigUpsertSchema = z.object({
  scope: z.enum(["global", "office", "job"]),
  scopeId: z.number().int().positive().nullable(),
  slotDurationMinutes: z.number().int().min(15).max(240).optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reminderOffsetsJson: z.string().optional(),
  tokenExpiryDays: z.number().int().min(1).max(90).optional(),
  smsOnInvite: z.boolean().optional(),
  bookingWindowDays: z.number().int().min(1).max(90).optional(),
  minNoticeHours: z.number().int().min(0).max(168).optional(),
  webhookUrl: z.string().max(2000).nullable().optional(),
  webhookEventsJson: z.string().optional(),
});

export type ApplicationSubmit = z.infer<typeof applicationSubmitSchema>;
export type BookSlot = z.infer<typeof bookSlotSchema>;
