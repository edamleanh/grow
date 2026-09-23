"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { ClassFormModal } from "@/components/classes/ClassFormModal";
import { formatDong } from "@/lib/currency";
import type { ClassStatus } from "@prisma/client";

const STATUS_LABELS: Record<ClassStatus, string> = {
  OPEN: "Đang Mở",
  CLOSED: "Đã Khóa",
};
const STATUS_TONES: Record<ClassStatus, StatusTone> = {
  OPEN: "green",
  CLOSED: "gray",
};

type Option = { id: string; name: string };
type Subject = Option & { defaultFeePerBatch: number };
type TeacherOption = Option & { subjectId: string };
type ClassRow = {
  id: string;
  name: string;
  grade: number;
  subjectName: string;
  academicYearLabel: string;
  teacherName: string;
  feePerBatch: number;
  status: ClassStatus;
};

export function ClassesView({
  classes,
  subjects,
  academicYears,
  teachers,
  activeAcademicYearId,
  canCreate,
}: {
  classes: ClassRow[];
  subjects: Subject[];
  academicYears: Option[];
  teachers: TeacherOption[];
  activeAcademicYearId: string | null;
  canCreate: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [modalOpen, setModalOpen] = useState(false);
  const subjectFilter = searchParams.get("subjectId") ?? "";
  const gradeFilter = searchParams.get("grade") ?? "";

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Auto-searches after typing pauses — no Enter/nút "Tìm" cần bấm nữa.
  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) params.set("q", value);
      else params.delete("q");
      router.push(`/classes?${params.toString()}`);
    }, 300);
  }

  function updateFilter(key: "subjectId" | "grade", value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/classes?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Quản Lý Lớp Học</h1>
        {canCreate && <Button onClick={() => setModalOpen(true)}>+ Tạo Lớp Học Mới</Button>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          placeholder="Tìm theo Tên lớp, Giáo viên"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          value={subjectFilter}
          onChange={(e) => updateFilter("subjectId", e.target.value)}
        >
          <option value="">Tất cả môn</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          value={gradeFilter}
          onChange={(e) => updateFilter("grade", e.target.value)}
        >
          <option value="">Tất cả khối</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
            <option key={g} value={g}>
              Khối {g}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Tên lớp</th>
              <th className="px-4 py-2 font-medium">Môn & Khối</th>
              <th className="px-4 py-2 font-medium">Năm học</th>
              <th className="px-4 py-2 font-medium">Giáo viên phụ trách</th>
              <th className="px-4 py-2 font-medium">Học phí gốc</th>
              <th className="px-4 py-2 font-medium">Trạng thái</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {classes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Chưa có lớp học nào trong năm học này.
                </td>
              </tr>
            )}
            {classes.map((klass) => (
              <tr key={klass.id}>
                <td className="px-4 py-2 font-medium text-slate-900">{klass.name}</td>
                <td className="px-4 py-2 text-slate-600">
                  {klass.subjectName} · Khối {klass.grade}
                </td>
                <td className="px-4 py-2 text-slate-600">{klass.academicYearLabel}</td>
                <td className="px-4 py-2 text-slate-600">{klass.teacherName}</td>
                <td className="px-4 py-2 text-slate-600">{formatDong(klass.feePerBatch)}</td>
                <td className="px-4 py-2">
                  <StatusBadge tone={STATUS_TONES[klass.status]} label={STATUS_LABELS[klass.status]} />
                </td>
                <td className="px-4 py-2 text-right">
                  <a
                    href={`/classes/${klass.id}`}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Xem Chi Tiết
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canCreate && (
        <ClassFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          subjects={subjects}
          academicYears={academicYears}
          teachers={teachers}
          activeAcademicYearId={activeAcademicYearId}
        />
      )}
    </div>
  );
}
