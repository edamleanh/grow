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

// Ghi danh ngay khi tạo học sinh mới, từ danh sách lớp đang mở của đúng
// khối (StudentFormModal). Cùng ý nghĩa startBatchNumber như enrollSchema —
// chỉ tính học phí từ đợt này trở đi, không tạo nợ ảo các đợt trước.
export const newStudentEnrollmentSchema = z.object({
  classId: z.string().min(1),
  startBatchNumber: z.coerce.number().int().min(1).max(12),
});

export const createStudentSchema = studentSchema.extend({
  enrollments: z.array(newStudentEnrollmentSchema).default([]),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
