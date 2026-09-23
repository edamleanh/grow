"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TeacherFormModal } from "@/components/teachers/TeacherFormModal";
import { deleteTeacher } from "@/app/(dashboard)/teachers/actions";

type Subject = { id: string; name: string };
type TeacherRow = {
  id: string;
  code: string;
  fullName: string;
  phone: string | null;
  subjectId: string;
  subject: { name: string };
  _count: { classesAsPrimary: number };
};

export function TeachersView({
  teachers,
  subjects,
}: {
  teachers: TeacherRow[];
  subjects: Subject[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [modalTeacher, setModalTeacher] = useState<TeacherRow | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Auto-searches after typing pauses — no Enter/nút "Tìm" cần bấm nữa.
  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) params.set("q", value);
      else params.delete("q");
      router.push(`/teachers?${params.toString()}`);
    }, 300);
  }

  function openCreate() {
    setModalTeacher(undefined);
    setModalOpen(true);
  }

  function openEdit(teacher: TeacherRow) {
    setModalTeacher(teacher);
    setModalOpen(true);
  }

  function handleDelete(teacher: TeacherRow) {
    setDeleteError(null);
    if (!window.confirm(`Xoá giáo viên "${teacher.fullName}"?`)) return;
    startDeleteTransition(async () => {
      try {
        await deleteTeacher(teacher.id);
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "Không thể xoá giáo viên");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Quản Lý Giáo Viên</h1>
        <Button onClick={openCreate}>+ Thêm Mới Giáo Viên</Button>
      </div>

      <input
        className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        placeholder="Tìm theo Tên GV, SĐT, Môn phụ trách"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
      />

      {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Mã GV</th>
              <th className="px-4 py-2 font-medium">Họ tên</th>
              <th className="px-4 py-2 font-medium">SĐT</th>
              <th className="px-4 py-2 font-medium">Môn chuyên môn</th>
              <th className="px-4 py-2 font-medium">Số lớp phụ trách</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teachers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Chưa có giáo viên nào.
                </td>
              </tr>
            )}
            {teachers.map((teacher) => (
              <tr key={teacher.id}>
                <td className="px-4 py-2 text-slate-500">{teacher.code}</td>
                <td className="px-4 py-2 font-medium text-slate-900">{teacher.fullName}</td>
                <td className="px-4 py-2 text-slate-600">
                  {teacher.phone || "Chưa có SĐT"}
                </td>
                <td className="px-4 py-2 text-slate-600">{teacher.subject.name}</td>
                <td className="px-4 py-2 text-slate-600">{teacher._count.classesAsPrimary}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                      onClick={() => openEdit(teacher)}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      onClick={() => handleDelete(teacher)}
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

      <TeacherFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        subjects={subjects}
        teacher={modalTeacher}
      />
    </div>
  );
}
