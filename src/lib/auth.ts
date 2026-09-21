import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

// requirements.md defines no real login flow — role switching is done via
// the header "Quick Switcher" (Chế độ Demo Quick Switcher, §1.4/§4.1): the
// active user is whichever demo User row (one per role, seeded in
// prisma/seed.ts) is selected. This file resolves "who is the current user"
// from that selection so RBAC (lib/rbac.ts) and audit fields (e.g.
// Receipt.createdByUserId) have a real User to point at.
//
// If real authentication is added later, only this file needs to change —
// callers everywhere else just use getCurrentUser().

const COOKIE_NAME = "edumanager_active_user";

export type CurrentUser = {
  id: string;
  fullName: string;
  role: UserRole;
  teacherId: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser> {
  const store = await cookies();
  const activeUserId = store.get(COOKIE_NAME)?.value;

  const user = activeUserId
    ? await prisma.user.findUnique({ where: { id: activeUserId } })
    : null;

  const resolved = user ?? (await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } }));

  return {
    id: resolved.id,
    fullName: resolved.fullName,
    role: resolved.role,
    teacherId: resolved.teacherId,
  };
}

export async function listDemoUsers() {
  return prisma.user.findMany({ orderBy: { role: "asc" } });
}
