"use client";

import { createContext, useContext } from "react";

/** Facts about the current course that content can reference without hard-coding them. */
export const CourseInfo = createContext<{ validityMonths: number | null }>({ validityMonths: null });


/** "The certificate is valid for one year…" — from the course's admin setting. */
export function CertificateValidityNote() {
  const { validityMonths: m } = useContext(CourseInfo);
  if (!m) return null;
  const period = m % 12 === 0 ? (m === 12 ? "one year" : `${m / 12} years`) : `${m} month${m === 1 ? "" : "s"}`;
  return <>The certificate is valid for {period}, after which you&apos;ll be asked to refresh it.</>;
}
