import { SupervisorAccount, Assessment } from '@mui/icons-material';

export const FIELD_LABELS = {
  firstName: 'First Name',
  lastName: 'Last Name',
  DOB: 'Date of Birth',
  contactInfo: 'Contact Information',
  insuranceInfo: 'Insurance Info',
  returningPatient: 'Returning Patient',
  overrideUrgency: 'Case Urgency',
  AIUrgency: 'AI Urgency',
  overrideSummary: 'Override Summary',
  AISummary: 'AI Summary',
  clinicianNotes: 'Clinician Notes',
  dateCreated: 'Date Created',
  reviewReason: 'Review Reason',
  reviewedByEmail: 'Reviewed By',
  reviewTimestamp: 'Reviewed At',
  scheduledDate: 'Scheduled Date',
  status: 'Status',
};

// this should reflect how these enums are stored in db
export const URGENCY_VALUES = {
  ROUTINE: "routine",
  SEMI_URGENT: "semi-urgent",
  URGENT: "urgent",
};

// this should reflect how these enums are stored in db
export const STATUS_VALUES = {
  UNREVIEWED: "unreviewed",
  REVIEWED: "reviewed",
};

export const STATUS_LABELS = {
  [STATUS_VALUES.UNREVIEWED]: "Unreviewed",
  [STATUS_VALUES.REVIEWED]: "Reviewed",
};

export const URGENCY_LABELS = {
  [URGENCY_VALUES.ROUTINE]: "Routine",
  [URGENCY_VALUES.SEMI_URGENT]: "Semi-Urgent",
  [URGENCY_VALUES.URGENT]: "Urgent",
};

export const URGENCY_PRIORITY = {
  [URGENCY_VALUES.URGENT]: 1,
  [URGENCY_VALUES.SEMI_URGENT]: 2,
  [URGENCY_VALUES.ROUTINE]: 3,
};

export const RETURNING_PATIENT_OPTIONS = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
];

export const NAV_PAGES = [
  { label: "Dashboard", path: "/dashboard", icon: Assessment },
  { label: "Admin Portal", path: "/admin", role: "admin", icon: SupervisorAccount },
];

export const USER_ROLE_OPTIONS = [
  { value: "physician", label: "Physician" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

// helpers for changing roles to Title Case for display
export const ROLE_LABEL_MAP = USER_ROLE_OPTIONS.reduce((acc, opt) => {
  acc[opt.value] = opt.label;
  return acc;
}, {});

export const roleLabel = (role) => {
  if (role === null || role === undefined) return "";
  const key = String(role).toLowerCase();
  return ROLE_LABEL_MAP[key];
};
