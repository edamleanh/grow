"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { createStudentSchema } from "@/components/students/student-schema";
import { createStudent, updateStudent } from "@/app/(dashboard)/students/actions";
import { getOpenClassesByGrade } from "@/app/(dashboard)/classes/enrollment-actions";

type Student = {
  id: string;
  fullName: string;
  phone: string | null;
  grade: number;
  note: string | null;
};

type AvailableClass = Awaited<ReturnType<typeof getOpenClassesByGrade>>[number];

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
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoadingClasses, startClassLoad] = useTransition();
  const [isPending, startTransition] = useTransition();

  // Ghi danh ngay khi tạo mới: gợi ý lớp đang mở đúng khối vừa chọn, theo
  // từng môn, để không phải tạo học sinh trước rồi mới đi ghi danh riêng ở
  // từng lớp (edumanager-ops — cùng luồng enrollStudent).
  useEffect(() => {
    if (!open || isEdit) return;
    startClassLoad(async () => {
      const rows = await getOpenClassesByGrade(grade);
      setAvailableClasses(rows);
      setSelectedBatches({});
    });
  }, [open, isEdit, grade]);

  function handleClose() {
    setError(null);
    setSelectedBatches({});
    onClose();
  }

  function toggleClass(cls: AvailableClass) {
    setSelectedBatches((prev) => {
      const next = { ...prev };
      if (cls.classId in next) {
        delete next[cls.classId];
      } else {
        next[cls.classId] = cls.defaultBatchNumber;
      }
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (isEdit && student) {
      const parsed = createStudentSchema.safeParse({ fullName, phone, grade, note, enrollments: [] });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
        return;
      }
      startTransition(async () => {
        try {
          await updateStudent(student.id, parsed.data);
          handleClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
        }
      });
      return;
    }

    const enrollments = Object.entries(selectedBatches).map(([classId, startBatchNumber]) => ({
      classId,
      startBatchNumber,
    }));
    const parsed = createStudentSchema.safeParse({ fullName, phone, grade, note, enrollments });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }
    startTransition(async () => {
      try {
        await createStudent(parsed.data);
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

        {!isEdit && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Ghi danh vào lớp (tùy chọn)
            </label>
            {isLoadingClasses && <p className="text-xs text-slate-400">Đang tải danh sách lớp...</p>}
            {!isLoadingClasses && availableClasses.length === 0 && (
              <p className="text-xs text-slate-400">Chưa có lớp nào đang mở cho Khối {grade}.</p>
            )}
            {!isLoadingClasses && availableClasses.length > 0 && (
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {Object.entries(
                  availableClasses.reduce<Record<string, AvailableClass[]>>((groups, cls) => {
                    (groups[cls.subjectName] ??= []).push(cls);
                    return groups;
                  }, {}),
                ).map(([subjectName, classesInSubject]) => (
                  <div key={subjectName}>
                    <div className="mb-1 text-xs font-semibold text-slate-500">{subjectName}</div>
                    <div className="space-y-1">
                      {classesInSubject.map((cls) => {
                        const isChecked = cls.classId in selectedBatches;
                        return (
                          <div key={cls.classId} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleClass(cls)}
                            />
                            <span className="flex-1 text-slate-700">{cls.className}</span>
                            {isChecked && (
                              <select
                                className="rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                                value={selectedBatches[cls.classId]}
                                onChange={(e) =>
                                  setSelectedBatches((prev) => ({
                                    ...prev,
                                    [cls.classId]: Number(e.target.value),
                                  }))
                                }
                              >
                                {cls.batches.map((b) => (
                                  <option key={b.batchNumber} value={b.batchNumber}>
                                    {b.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-400">
              Chọn đợt nhập học cho từng lớp — hệ thống chỉ tính học phí từ đợt đó trở đi.
            </p>
          </div>
        )}

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
