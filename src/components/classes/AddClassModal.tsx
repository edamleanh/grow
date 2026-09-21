"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { enrollSchema, transferSchema } from "@/components/classes/enrollment-schema";
import {
  enrollStudent,
  transferStudent,
  getOpenClassesByGrade,
  findSameSubjectActiveEnrollment,
} from "@/app/(dashboard)/classes/enrollment-actions";

type AvailableClass = Awaited<ReturnType<typeof getOpenClassesByGrade>>[number];
type SameSubjectConflict = {
  enrollmentId: string;
  className: string;
  currentBatchNumber: number;
  batches: { batchNumber: number; name: string }[];
};

// Mirror of EnrollStudentModal, but with the student fixed and the class
// picked instead — used from Student detail's "Ghi Danh Thêm Lớp" (đối xứng
// với "+ Ghi Danh Học Sinh" ở Class detail, chỉ khác chiều chọn).
export function AddClassModal({
  open,
  onClose,
  studentId,
  studentGrade,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentGrade: number;
}) {
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<AvailableClass | undefined>(undefined);
  const [startBatchNumber, setStartBatchNumber] = useState(1);
  const [conflict, setConflict] = useState<SameSubjectConflict | null | undefined>(undefined);
  const [endBatchNumber, setEndBatchNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingClasses, startClassLoad] = useTransition();
  const [isCheckingConflict, startConflictCheck] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();

  useEffect(() => {
    if (!open) return;
    startClassLoad(async () => {
      const rows = await getOpenClassesByGrade(studentGrade, studentId);
      setAvailableClasses(rows);
    });
  }, [open, studentGrade, studentId]);

  function pickClass(cls: AvailableClass) {
    setSelectedClass(cls);
    setStartBatchNumber(cls.defaultBatchNumber);
    setConflict(undefined);
    // Same-subject class switch must close out the old class's enrollment
    // instead of stacking a second active one — see edumanager-ops §4 and
    // findSameSubjectActiveEnrollment's comment (same check as EnrollStudentModal).
    startConflictCheck(async () => {
      const found = await findSameSubjectActiveEnrollment(studentId, cls.classId);
      setConflict(found);
      if (found) setEndBatchNumber(found.currentBatchNumber);
    });
  }

  function handleClose() {
    setError(null);
    setSelectedClass(undefined);
    setConflict(undefined);
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!selectedClass) return;

    if (conflict) {
      const parsed = transferSchema.safeParse({
        enrollmentId: conflict.enrollmentId,
        endBatchNumber,
        targetClassId: selectedClass.classId,
        startBatchNumber,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
        return;
      }
      startSubmit(async () => {
        try {
          await transferStudent(parsed.data);
          handleClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
        }
      });
      return;
    }

    const parsed = enrollSchema.safeParse({ studentId, classId: selectedClass.classId, startBatchNumber });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }
    startSubmit(async () => {
      try {
        await enrollStudent(parsed.data);
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  const grouped = availableClasses.reduce<Record<string, AvailableClass[]>>((groups, cls) => {
    (groups[cls.subjectName] ??= []).push(cls);
    return groups;
  }, {});

  return (
    <Modal open={open} onClose={handleClose} title="Ghi Danh Thêm Lớp">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Chọn lớp (Khối {studentGrade}) <span className="text-red-500">*</span>
          </label>
          {isLoadingClasses && <p className="text-xs text-slate-400">Đang tải danh sách lớp...</p>}
          {!isLoadingClasses && availableClasses.length === 0 && (
            <p className="text-xs text-slate-400">
              Không có lớp nào đang mở cho Khối {studentGrade} mà học sinh chưa ghi danh.
            </p>
          )}
          {!isLoadingClasses && availableClasses.length > 0 && (
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {Object.entries(grouped).map(([subjectName, classesInSubject]) => (
                <div key={subjectName}>
                  <div className="mb-1 text-xs font-semibold text-slate-500">{subjectName}</div>
                  <div className="space-y-1">
                    {classesInSubject.map((cls) => (
                      <label key={cls.classId} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="targetClass"
                          checked={selectedClass?.classId === cls.classId}
                          onChange={() => pickClass(cls)}
                        />
                        <span className="text-slate-700">{cls.className}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isCheckingConflict && (
          <p className="text-xs text-slate-400">Đang kiểm tra lớp cùng môn học sinh đang học...</p>
        )}

        {conflict && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="mb-2">
              ⚠️ Học sinh đang học <strong>{conflict.className}</strong> (cùng môn với lớp này). Đây
              sẽ được xử lý như <strong>Chuyển Lớp</strong> — cần chọn đợt kết thúc ở lớp cũ để nợ
              phí đợt cũ được bảo lưu đúng, không bị mất.
            </p>
            <label className="mb-1 block text-xs font-medium text-amber-900">
              Học hết Đợt (ở {conflict.className})
            </label>
            <select
              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              value={endBatchNumber}
              onChange={(e) => setEndBatchNumber(Number(e.target.value))}
            >
              {conflict.batches.map((b) => (
                <option key={b.batchNumber} value={b.batchNumber}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedClass && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {conflict ? "Bắt đầu học ở lớp mới từ Đợt" : "Bắt đầu học từ Đợt"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              value={startBatchNumber}
              onChange={(e) => setStartBatchNumber(Number(e.target.value))}
            >
              {selectedClass.batches.map((b) => (
                <option key={b.batchNumber} value={b.batchNumber}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Hệ thống chỉ tính học phí từ đợt này trở đi, không tính nợ các đợt trước.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Huỷ
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedClass || isCheckingConflict}>
            {isSubmitting ? "Đang lưu..." : conflict ? "Xác Nhận Chuyển Lớp" : "Ghi Danh"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
