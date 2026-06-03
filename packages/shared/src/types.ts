export type ApplicationStatus =
  | "submitted"
  | "invited"
  | "scheduled"
  | "reminded"
  | "completed"
  | "rejected";

export type ConfigScope = "global" | "office" | "job";

export type MessageChannel = "email" | "sms";

export interface ScheduleConfigResolved {
  slotDurationMinutes: number;
  bufferMinutes: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  reminderOffsets: ReminderOffset[];
  tokenExpiryDays: number;
  smsOnInvite: boolean;
  bookingWindowDays: number;
  minNoticeHours: number;
  webhookUrl?: string;
  webhookEvents: string[];
}

export interface ReminderOffset {
  hoursBefore: number;
  templateKeyEmail?: string;
  templateKeySms?: string;
}

export interface MessageContext {
  firstName: string;
  lastName?: string;
  jobTitle: string;
  officeName: string;
  officeLocation: string;
  scheduleUrl?: string;
  interviewTimeLocal?: string;
  [key: string]: string | undefined;
}

export interface FormFieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  options?: string[];
}
