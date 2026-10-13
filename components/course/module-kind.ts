import { Award, BookOpen, ClipboardCheck, FilePenLine, MessagesSquare, type LucideIcon } from "lucide-react";
import type { CourseModule } from "@/lib/course-types";

// How each module type is presented in navigation: a broad kind, its label and icon.

export type ModuleKind = "lesson" | "case" | "assessment" | "acknowledgement" | "certificate";

export const MODULE_KINDS: Record<ModuleKind, { label: string; Icon: LucideIcon }> = {
  lesson: { label: "Lesson", Icon: BookOpen },
  case: { label: "Case study", Icon: MessagesSquare },
  assessment: { label: "Assessment", Icon: ClipboardCheck },
  acknowledgement: { label: "Acknowledgement", Icon: FilePenLine },
  certificate: { label: "Certificate", Icon: Award },
};

export function moduleKind(type: CourseModule["type"]): ModuleKind {
  switch (type) {
    case "case":
      return "case";
    case "exam":
      return "assessment";
    case "acknowledgement":
      return "acknowledgement";
    case "certificate":
      return "certificate";
    default:
      return "lesson";
  }
}
