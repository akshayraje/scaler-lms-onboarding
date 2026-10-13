// Company-specific details shown in courses (reporting contacts, policy link).
// Kept in one place so they can be updated without touching course content.

export type CommitteeMember = { name: string; designation: string; role: string };

export const ORG = {
  /** The company's POSH policy document. */
  poshPolicyUrl: "https://sites.google.com/scaler.com/policies-guidelines/posh",

  internalCommittee: {
    /** Presiding Officer first. */
    members: [
      { name: "Sneha Sindhe", designation: "Director, People", role: "Presiding Officer" },
      { name: "Akshay Raje", designation: "Head, People & Culture, People", role: "Member" },
      { name: "Ashwini Senad", designation: "Sr. Manager, HRBP, People", role: "Member" },
      { name: "Rishabh Shah", designation: "Head, Legal", role: "Member" },
      { name: "Palash Qureshi", designation: "Associate Vice President - Business Development", role: "Member" },
      { name: "Shreya Moolya", designation: "Associate Director - Growth Marketing", role: "Member" },
      { name: "Anuj Sharma", designation: "Director & Principal Consultant", role: "External Member" },
    ] satisfies CommitteeMember[],
    /** Where complaints and concerns are sent. */
    email: "helpline@interviewbit.com",
  },
};
