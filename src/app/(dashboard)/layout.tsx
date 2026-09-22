import { getCurrentUser, listDemoUsers } from "@/lib/auth";
import { getActiveAcademicYearId, listAcademicYears } from "@/lib/academic-year";
import { QuickSwitcher } from "@/components/layout/QuickSwitcher";
import { AcademicYearSelector } from "@/components/layout/AcademicYearSelector";
import type { UserRole } from "@prisma/client";

// Authenticated shell: sidebar nav (role-filtered) + header (brand, Academic
// Year selector, Quick Switcher). See .claude/skills/web-development/SKILL.md
// and .claude/skills/edumanager-ops/SKILL.md §0/§8 for the RBAC rules below.

const NAV_ITEMS: { href: string; label: string; icon: string; roles: UserRole[] }[] = [
  // Role scoping per requirements.md §1.3: Admin has full access; Cashier is
  // POS-only; Teacher sees their own classes + POS. See edumanager-ops §8.
  { href: "/", label: "Dashboard", icon: "📊", roles: ["ADMIN"] },
  { href: "/students", label: "Quản Lý Học Sinh", icon: "👨‍🎓", roles: ["ADMIN"] },
  { href: "/classes", label: "Quản Lý Lớp Học", icon: "🏫", roles: ["ADMIN", "TEACHER"] },
  { href: "/teachers", label: "Quản Lý Giáo Viên", icon: "👨‍🏫", roles: ["ADMIN"] },
  { href: "/pos", label: "POS Thu Tiền Học Phí", icon: "💳", roles: ["ADMIN", "CASHIER", "TEACHER"] },
  { href: "/print-roster", label: "In Danh Sách", icon: "🖨️", roles: ["ADMIN", "TEACHER"] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Chủ trung tâm",
  CASHIER: "Thu ngân",
  TEACHER: "Giáo viên",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, demoUsers, academicYears, activeAcademicYearId] = await Promise.all([
    getCurrentUser(),
    listDemoUsers(),
    listAcademicYears(),
    getActiveAcademicYearId(),
  ]);

  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(currentUser.role));
  const quickSwitcherEnabled = process.env.NEXT_PUBLIC_ENABLE_QUICK_SWITCHER !== "false";

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
        <div className="mb-6 text-lg font-semibold text-brand-700">
          Trung Tâm Ngoại Ngữ Grow
        </div>
        <nav className="space-y-1">
          {visibleNavItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-brand-50 hover:text-brand-700"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Năm học:</span>
            <AcademicYearSelector years={academicYears} activeYearId={activeAcademicYearId} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {currentUser.fullName} · {ROLE_LABELS[currentUser.role]}
            </span>
            {quickSwitcherEnabled && (
              <QuickSwitcher users={demoUsers} activeUserId={currentUser.id} />
            )}
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
