// Company-specific details shown in courses (reporting contacts, policy links…).
// Kept in one place so HR can update them without touching course content.
// `null` / empty values render as a clearly marked "to be added" placeholder.

export type ContactPerson = { name: string; role: string; email?: string; phone?: string };

export const ORG = {
  /** Link to the company's POSH policy document. */
  poshPolicyUrl: null as string | null,
  /** Who the company policy covers, if broader than the Act (e.g. "employees of all genders"). */
  policyCoverage: null as string | null,

  internalCommittee: {
    /** Presiding Officer first. */
    members: [] as ContactPerson[],
    /** Shared inbox for complaints. */
    email: null as string | null,
    /** Online complaint form, if any. */
    formUrl: null as string | null,
  },

  /** Where appeals against IC recommendations go (per service rules). */
  appellateAuthority: null as string | null,

  /** District Local Committee, for complaints against the employer itself. */
  localCommittee: null as { district: string; contact: string } | null,

  /** Counselling / Employee Assistance Programme details. */
  counselling: null as string | null,
};
