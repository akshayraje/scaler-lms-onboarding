// Server-rendered dates use the org's timezone rather than the container's (UTC).
const TZ = process.env.APP_TIMEZONE ?? "Asia/Kolkata";

export const formatDateTime = (d: Date | string) => new Date(d).toLocaleString("en-IN", { timeZone: TZ });
export const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
