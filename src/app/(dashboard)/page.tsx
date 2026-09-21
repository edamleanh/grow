import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getActiveAcademicYearId } from "@/lib/academic-year";
import { formatDong } from "@/lib/currency";

// Module 1: Dashboard (requirements.md §4.2) — Admin-only (edumanager-ops
// §8: "Chỉ Admin được thấy Dashboard doanh thu tổng quan").

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (currentUser.role !== "ADMIN") {
    redirect("/pos");
  }

  const activeAcademicYearId = await getActiveAcademicYearId();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [todayRevenue, studentCounts, activeClasses, closedClasses] = await Promise.all([
    prisma.receipt.aggregate({
      _sum: { totalAmount: true },
      where: { issuedAt: { gte: startOfToday, lt: endOfToday } },
    }),
    prisma.student.groupBy({ by: ["status"], _count: { _all: true } }),
    activeAcademicYearId
      ? prisma.class.count({ where: { academicYearId: activeAcademicYearId, status: "OPEN" } })
      : Promise.resolve(0),
    activeAcademicYearId
      ? prisma.class.count({ where: { academicYearId: activeAcademicYearId, status: "CLOSED" } })
      : Promise.resolve(0),
  ]);

  const totalStudents = studentCounts.reduce((sum, row) => sum + row._count._all, 0);
  const graduatedStudents =
    studentCounts.find((row) => row.status === "GRADUATED")?._count._all ?? 0;

  const statCards = [
    { label: "Doanh thu hôm nay", value: formatDong(todayRevenue._sum.totalAmount ?? 0) },
    {
      label: "Tổng số học sinh",
      value: `${totalStudents} (${totalStudents - graduatedStudents} đang học / ${graduatedStudents} tốt nghiệp)`,
    },
    { label: "Số lớp đang hoạt động", value: String(activeClasses) },
    { label: "Số lớp đã kết thúc", value: String(closedClasses) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Tổng Quan</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="text-sm text-slate-500">{card.label}</div>
            <div className="mt-2 text-lg font-semibold text-brand-700">
              {card.value}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-slate-700">
          Lớp Học Kết Thúc Cần Thu Nợ
        </h2>
        <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>
      </div>
    </div>
  );
}
