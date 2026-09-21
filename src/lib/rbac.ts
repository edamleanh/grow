import type { UserRole } from "@prisma/client";

// Server-side role guards. UI hiding is not enough — every Server Action /
// Route Handler that mutates Class/Teacher/Student/Receipt/YearPromotion
// must call one of these. See .claude/skills/edumanager-ops/SKILL.md §8.

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function requireRole(currentRole: UserRole, allowed: UserRole[]) {
  if (!allowed.includes(currentRole)) {
    throw new ForbiddenError(`Role ${currentRole} is not permitted to perform this action`);
  }
}

export const requireAdmin = (role: UserRole) => requireRole(role, ["ADMIN"]);
export const requireAdminOrCashier = (role: UserRole) => requireRole(role, ["ADMIN", "CASHIER"]);
