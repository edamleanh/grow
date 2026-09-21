import { z } from "zod";

// requirements.md §4.4: name/grade/subject/academicYear/teacher/fee all
// required on create. feePerBatch is whole VNĐ (đồng) here — the form
// converts from the "nghìn VNĐ" UI input via lib/currency.ts before calling
// this schema, matching the DB convention (database-design skill).
export const classSchema = z.object({
  name: z.string().trim().min(1, "Tên lớp là bắt buộc"),
  grade: z.coerce.number().int().min(1, "Khối từ 1 đến 12").max(12, "Khối từ 1 đến 12"),
  subjectId: z.string().min(1, "Môn học là bắt buộc"),
  academicYearId: z.string().min(1, "Năm học là bắt buộc"),
  primaryTeacherId: z.string().min(1, "Giáo viên phụ trách là bắt buộc"),
  feePerBatch: z.coerce.number().int().positive("Học phí phải lớn hơn 0"),
});

export type ClassInput = z.infer<typeof classSchema>;

export const batchSchema = z.object({
  name: z.string().trim().min(1, "Tên đợt là bắt buộc"),
  teacherId: z.string().min(1, "Giáo viên đợt là bắt buộc"),
  feePerBatch: z.coerce.number().int().positive("Học phí phải lớn hơn 0"),
  status: z.enum(["UPCOMING", "ONGOING", "COMPLETED"]),
});

export type BatchInput = z.infer<typeof batchSchema>;
