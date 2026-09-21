"use client";

import { useTransition } from "react";
import type { UserRole } from "@prisma/client";
import { setActiveUser } from "@/app/(dashboard)/quick-switcher-actions";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "👑 Admin",
  CASHIER: "💵 Thu Ngân",
  TEACHER: "👨‍🏫 Giáo Viên",
};

type DemoUser = { id: string; fullName: string; role: UserRole };

export function QuickSwitcher({
  users,
  activeUserId,
}: {
  users: DemoUser[];
  activeUserId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
      {users.map((user) => {
        const isActive = user.id === activeUserId;
        return (
          <button
            key={user.id}
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => setActiveUser(user.id))}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              isActive
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:bg-white hover:text-brand-700"
            }`}
            title={user.fullName}
          >
            {ROLE_LABELS[user.role]}
          </button>
        );
      })}
    </div>
  );
}
