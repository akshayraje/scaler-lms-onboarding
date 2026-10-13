// The HRMS (Darwinbox) employee fields we use — single source of truth for the
// sync (which Darwinbox field to read) and for notification templates (which
// {{placeholders}} exist). Add a field here to make it available everywhere.

export const HRMS_FIELDS = [
  { key: "name", darwinbox: "full_name", placeholder: "full_name", label: "Full name", example: "Priya Sharma" },
  { key: "email", darwinbox: "company_email_id", placeholder: "email", label: "Work email", example: "priya.sharma@scaler.com" },
  { key: "employeeCode", darwinbox: "employee_id", placeholder: "employee_id", label: "Employee ID", example: "SCL-1042" },
  // Darwinbox sends DD-MM-YYYY (e.g. 30-06-2025); templates show it as "6 October 2026".
  { key: "dateOfJoining", darwinbox: "date_of_joining", placeholder: "date_of_joining", label: "Date of joining", example: "6 October 2026" },
  { key: "managerEmail", darwinbox: "direct_manager_email", placeholder: "manager_email", label: "Manager email", example: "arjun.mehta@scaler.com" },
  { key: "department", darwinbox: "department", placeholder: "department", label: "Department", example: "Academics" },
  { key: "designation", darwinbox: "designation", placeholder: "designation", label: "Designation", example: "Teaching Assistant" },
] as const;

export type HrmsFieldKey = (typeof HRMS_FIELDS)[number]["key"];
export type HrmsPlaceholder = (typeof HRMS_FIELDS)[number]["placeholder"];
