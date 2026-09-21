"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { teacherSchema } from "@/components/teachers/teacher-schema";
import { createTeacher, updateTeacher } from "@/app/(dashboard)/teachers/actions";

type Subject = { id: string; name: string };
type Teacher = {
  id: string;
  fullName: string;
  phone: string | null;
  subjectId: string;
};

export function TeacherFormModal({
  open,
  onClose,
  subjects,
  teacher,
}: {
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  teacher?: Teacher;
}) {
  const isEdit = Boolean(teacher);
  const [fullName, setFullName] = useState(teacher?.fullName ?? "");
  const [phone, setPhone] = useState(teacher?.phone ?? "");
  const [subjectId, setSubjectId] = useState(teacher?.subjectId ?? subjects[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = teacherSchema.safeParse({ fullName, phone, subjectId });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit && teacher) {
          await updateTeacher(teacher.id, parsed.data);
        } else {
          await createTeacher(parsed.data);
        }
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? "Sửa Thông Tin Giáo Viên" : "Thêm Mới Giáo Viên"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Họ và Tên <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="VD: Nguyễn Văn A"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Số điện thoại
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Tùy chọn"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Môn phụ trách <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            Huỷ
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
