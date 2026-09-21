import { z } from "zod";

// requirements.md §3.1/§4.6: one receipt can bundle multiple (class, batch)
// line items across different classes; PRINTED auto-generates a code,
// MANUAL requires the cashier's own paper-stub code.
export const receiptItemSchema = z.object({
  classId: z.string().min(1),
  batchId: z.string().min(1),
  amount: z.coerce.number().int().positive("Số tiền phải lớn hơn 0"),
});

export const createReceiptSchema = z
  .object({
    studentId: z.string().min(1),
    receiptType: z.enum(["PRINTED", "MANUAL"]),
    manualReceiptCode: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : undefined)),
    items: z.array(receiptItemSchema).min(1, "Chọn ít nhất một đợt để thu tiền"),
  })
  .refine((data) => data.receiptType !== "MANUAL" || Boolean(data.manualReceiptCode), {
    message: "Biên lai nhập tay cần nhập mã từ cuống sổ",
    path: ["manualReceiptCode"],
  });

export type CreateReceiptInput = z.infer<typeof createReceiptSchema>;
