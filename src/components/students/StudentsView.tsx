"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { StudentFormModal } from "@/components/students/StudentFormModal";
import { deleteStudent } from "@/app/(dashboard)/students/actions";
import type { StudentStatus } from "@prisma/client";

const STATUS_LABELS: Record<StudentStatus, string> = {
  STUDYING: "Đang học",
  NO_CLASS: "Chưa có lớp",
  GRADUATED: "Đã tốt nghiệp",
};

const STATUS_TONES: Record<StudentStatus, StatusTone> = {
  STUDYING: "green",
  NO_CLASS: "gray",
  GRADUATED: "blue",
};

type StudentRow = {
  id: string;
  code: string;
  fullName: string;
  phone: string | null;
  grade: number;
  note: string | null;
  status: StudentStatus;
  activeClassNames: string[];
};

export function StudentsView({ students }: { students: StudentRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const gradeFilter = searchParams.get("grade") ?? "";
  const [modalStudent, setModalStudent] = useState<StudentRow | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (search) params.set("q", search);
    else params.delete("q");
    router.push(`/students?${params.toString()}`);
  }

  function updateGradeFilter(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("grade", value);
    else params.delete("grade");
    router.push(`/students?${params.toString()}`);
  }

  function openCreate() {
    setModalStudent(undefined);
    setModalOpen(true);
  }

  function openEdit(student: StudentRow) {
    setModalStudent(student);
    setModalOpen(true);
  }

  function handleDelete(student: StudentRow) {
    setDeleteError(null);
    if (!window.confirm(`Xoá học sinh "${student.fullName}"?`)) return;
    startDeleteTransition(async () => {
      try {
        await deleteStudent(student.id);
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "Không thể xoá học sinh");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Quản Lý Học Sinh</h1>
        <Button onClick={openCreate}>+ Thêm Mới Học Sinh</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={submitSearch} className="flex gap-2">
          <input
            className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            placeholder="Tìm theo Họ tên, SĐT, Mã HS"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            Tìm
          </Button>
        </form>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          value={gradeFilter}
          onChange={(e) => updateGradeFilter(e.target.value)}
        >
          <option value="">Tất cả khối</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
            <option key={g} value={g}>
              Khối {g}
            </option>
          ))}
        </select>
      </div>

      {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Mã HS</th>
              <th className="px-4 py-2 font-medium">Họ tên</th>
              <th className="px-4 py-2 font-medium">Khối</th>
              <th className="px-4 py-2 font-medium">Các lớp đang học</th>
              <th className="px-4 py-2 font-medium">Trạng thái</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Chưa có học sinh nào.
                </td>
              </tr>
            )}
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-4 py-2 text-slate-500">{student.code}</td>
                <td className="px-4 py-2 font-medium text-slate-900">{student.fullName}</td>
                <td className="px-4 py-2 text-slate-600">Khối {student.grade}</td>
                <td className="px-4 py-2 text-slate-600">
                  {student.activeClassNames.length > 0
                    ? student.activeClassNames.join(", ")
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge
                    tone={STATUS_TONES[student.status]}
                    label={STATUS_LABELS[student.status]}
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <a
                      href={`/students/${student.id}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Xem Chi Tiết
                    </a>
                    <button
                      type="button"
                      className="text-sm font-medium text-slate-500 hover:text-slate-700"
                      onClick={() => openEdit(student)}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      onClick={() => handleDelete(student)}
                      disabled={isDeleting}
                    >
                      Xoá
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <StudentFormModal open={modalOpen} onClose={() => setModalOpen(false)} student={modalStudent} />
    </div>
  );
}
