import type { BatchStatus } from "@prisma/client";

// Shared status derivation for POS + Debt Report (requirements.md §4.6),
// so the color coding stays identical everywhere it's computed. See
// .claude/skills/edumanager-ops/SKILL.md §7.
export type BatchPaymentTone = "paid" | "current" | "upcoming" | "overdue";

export function getBatchPaymentTone(
  batchStatus: BatchStatus,
  fee: number,
  paid: number,
): BatchPaymentTone {
  if (paid >= fee) return "paid";
  if (batchStatus === "COMPLETED") return "overdue";
  if (batchStatus === "ONGOING") return "current";
  return "upcoming";
}
