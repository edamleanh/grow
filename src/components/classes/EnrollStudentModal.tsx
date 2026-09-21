"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { enrollSchema, transferSchema } from "@/components/classes/enrollment-schema";
import {
  enrollStudent,
  transferStudent,
  searchEligibleStudents,
  findSameSubjectActiveEnrollment,
} from "@/app/(dashboard)/classes/enrollment-actions";

type StudentOption = { id: string; code: string; fullName: string };
type BatchOption = { batchNumber: number; name: string };
type SameSubjectConflict = {
  enrollmentId: string;
  className: string;
  currentBatchNumber: number;
  batches: BatchOption[];
};

export function EnrollStudentModal({
  open,
  onClose,
  classId,
  batches,
  defaultBatchNumber,
}: {
  open: boolean;
  onClose: () => void;
  classId: string;
  batches: BatchOption[];
  defaultBatchNumber: number;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<StudentOption[]>([]);
  const [selected, setSelected] = useState<StudentOption | undefined>(undefined);
  const [conflict, setConflict] = useState<SameSubjectConflict | null | undefined>(undefined);
  const [startBatchNumber, setStartBatchNumber] = useState(defaultBatchNumber);
  const [endBatchNumber, setEndBatchNumber] = useState(defaultBatchNumber);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isCheckingConflict, startConflictCheck] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();

  function handleSearchChange(value: string) {
    setSearch(value);
    setSelected(undefined);
    setConflict(undefined);
    if (value.trim().length < 1) {
      setResults([]);
      return;
    }
    startSearch(async () => {
      const rows = await searchEligibleStudents(classId, value.trim());
      setResults(rows);
    });
  }

  function pickStudent(student: StudentOption) {
    setSelected(student);
    setResults([]);
    setSearch("");
    // Same-subject class switch must close out the old class's enrollment
    // (end batch) instead of silently stacking a second active enrollment —
    // see edumanager-ops §4 and findSameSubjectActiveEnrollment's comment.
    startConflictCheck(async () => {
      const found = await findSameSubjectActiveEnrollment(student.id, classId);
      setConflict(found);
      if (found) setEndBatchNumber(found.currentBatchNumber);
    });
  }

  function handleClose() {
    setError(null);
    setSearch("");
    setResults([]);
    setSelected(undefined);
    setConflict(undefined);
    setStartBatchNumber(defaultBatchNumber);
    setEndBatchNumber(defaultBatchNumber);
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (conflict) {
      const parsed = transferSchema.safeParse({
        enrollmentId: conflict.enrollmentId,
        endBatchNumber,
        targetClassId: classId,
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

    const parsed = enrollSchema.safeParse({ studentId: selected?.id ?? "", classId, startBatchNumber });
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

  return (
    <Modal open={open} onClose={handleClose} title="Ghi Danh Học Sinh Vào Lớp">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Học sinh <span className="text-red-500">*</span>
          </label>

          {selected ? (
            <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm">
              <span>
                <span className="font-medium text-slate-900">{selected.fullName}</span>{" "}
                <span className="text-slate-500">({selected.code})</span>
              </span>
              <button
                type="button"
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
                onClick={() => {
                  setSelected(undefined);
                  setConflict(undefined);
                }}
              >
                Đổi
              </button>
            </div>
          ) : (
            <>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                placeholder="Nhập tên hoặc mã HS để tìm..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                autoFocus
              />
              {isSearching && <p className="mt-1 text-xs text-slate-400">Đang tìm...</p>}
              {!isSearching && search.trim().length > 0 && results.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  Không tìm thấy học sinh phù hợp (có thể đã ghi danh lớp này, đã tốt nghiệp, hoặc khác khối với lớp này).
                </p>
              )}
              {results.length > 0 && (
                <ul className="mt-1 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {results.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                        onClick={() => pickStudent(s)}
                      >
                        <span className="font-medium text-slate-900">{s.fullName}</span>{" "}
                        <span className="text-slate-400">({s.code})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
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
            {batches.map((b) => (
              <option key={b.batchNumber} value={b.batchNumber}>
                {b.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Hệ thống chỉ tính học phí từ đợt này trở đi, không tính nợ các đợt trước.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Huỷ
          </Button>
          <Button type="submit" disabled={isSubmitting || !selected || isCheckingConflict}>
            {isSubmitting ? "Đang lưu..." : conflict ? "Xác Nhận Chuyển Lớp" : "Ghi Danh"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
