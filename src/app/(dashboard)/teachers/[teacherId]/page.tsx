// Trang Chi Tiết Giáo Viên Full-Page (requirements.md §4.5): Tab 1 Lớp Đang &
// Đã Phụ Trách + Tab 2 Báo Cáo Thù Lao & Doanh Thu Đợt (Payroll).
export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  const { teacherId } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">
        Chi Tiết Giáo Viên — {teacherId}
      </h1>
      <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>
    </div>
  );
}
