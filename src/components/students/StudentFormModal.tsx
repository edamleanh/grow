"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { studentSchema } from "@/components/students/student-schema";
import { createStudent, updateStudent } from "@/app/(dashboard)/students/actions";

type Student = {
  id: string;
  fullName: string;
  phone: string | null;
  grade: number;
  note: string | null;
};

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export function StudentFormModal({
  open,
  onClose,
  student,
}: {
  open: boolean;
  onClose: () => void;
  student?: Student;
}) {
  const isEdit = Boolean(student);
  const [fullName, setFullName] = useState(student?.fullName ?? "");
  const [phone, setPhone] = useState(student?.phone ?? "");
  const [grade, setGrade] = useState(student?.grade ?? 1);
  const [note, setNote] = useState(student?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = studentSchema.safeParse({ fullName, phone, grade, note });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit && student) {
          await updateStudent(student.id, parsed.data);
        } else {
          await createStudent(parsed.data);
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
      title={isEdit ? "Sửa Thông Tin Cá Nhân" : "Thêm Mới Học Sinh"}
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
            placeholder="VD: Trần Thị B"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Số điện thoại liên lạc
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
              Khối học <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Lưu ý học tập, lịch hẹn đóng tiền..."
          />
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
