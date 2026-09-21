import { z } from "zod";

// requirements.md §2.3: fullName required, phone optional (contact number),
// grade 1-12, note free text. Status is system-managed (NO_CLASS on create,
// then driven by enrollment/year-end promotion — edumanager-ops §2) so it is
// intentionally not part of this form.
export const studentSchema = z.object({
  fullName: z.string().trim().min(1, "Họ và tên là bắt buộc"),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  grade: z.coerce.number().int().min(1, "Khối từ 1 đến 12").max(12, "Khối từ 1 đến 12"),
  note: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type StudentInput = z.infer<typeof studentSchema>;
