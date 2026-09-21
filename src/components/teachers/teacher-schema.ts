import { z } from "zod";

// requirements.md §2.2: fullName required, phone optional, subject required.
export const teacherSchema = z.object({
  fullName: z.string().trim().min(1, "Họ và tên là bắt buộc"),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  subjectId: z.string().min(1, "Môn phụ trách là bắt buộc"),
});

export type TeacherInput = z.infer<typeof teacherSchema>;
