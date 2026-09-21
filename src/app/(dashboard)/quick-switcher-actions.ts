"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "edumanager_active_user";

export async function setActiveUser(userId: string) {
  // Demo-only role switch (requirements.md §1.4) — no permission check here
  // by design, since it exists precisely to let anyone preview other roles'
  // views. Disable it in a real deployment via NEXT_PUBLIC_ENABLE_QUICK_SWITCHER.
  await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const store = await cookies();
  store.set(COOKIE_NAME, userId, { path: "/" });
  revalidatePath("/", "layout");
}
