import { z } from "zod";

// edumanager-ops §4: startBatchNumber is mandatory and marks exactly where
// fee obligations begin — no virtual debt for earlier batches.
export const enrollSchema = z.object({
  studentId: z.string().min(1, "Học sinh là bắt buộc"),
  classId: z.string().min(1),
  startBatchNumber: z.coerce.number().int().min(1).max(12),
});
export type EnrollInput = z.infer<typeof enrollSchema>;

// edumanager-ops §4: transferring ends the old enrollment at endBatchNumber
// (debt on batches up to and including it stays on the old class — §5) and
// opens a new enrollment on the target class from startBatchNumber.
export const transferSchema = z.object({
  enrollmentId: z.string().min(1),
  endBatchNumber: z.coerce.number().int().min(1).max(12),
  targetClassId: z.string().min(1, "Lớp mới là bắt buộc"),
  startBatchNumber: z.coerce.number().int().min(1).max(12),
});
export type TransferInput = z.infer<typeof transferSchema>;

// edumanager-ops §5: withdrawing (nghỉ học) just closes the enrollment at
// endBatchNumber, like the old side of a transfer, but opens no new
// enrollment anywhere — debt on batches up to and including it stays put.
export const withdrawSchema = z.object({
  enrollmentId: z.string().min(1),
  endBatchNumber: z.coerce.number().int().min(1).max(12),
});
export type WithdrawInput = z.infer<typeof withdrawSchema>;
