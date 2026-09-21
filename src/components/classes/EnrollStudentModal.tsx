"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { enrollSchema } from "@/components/classes/enrollment-schema";
import { enrollStudent } from "@/app/(dashboard)/classes/enrollment-actions";

type StudentOption = { id: string; code: string; fullName: string };

const BATCH_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

export function EnrollStudentModal({
  open,
  onClose,
  classId,
  eligibleStudents,
  defaultBatchNumber,
}: {
  open: boolean;
  onClose: () => void;
  classId: string;
  eligibleStudents: StudentOption[];
  defaultBatchNumber: number;
}) {
  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState("");
  const [startBatchNumber, setStartBatchNumber] = useState(defaultBatchNumber);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return eligibleStudents;
    return eligibleStudents.filter(
      (s) => s.fullName.toLowerCase().includes(term) || s.code.toLowerCase().includes(term),
    );
  }, [search, eligibleStudents]);

  function handleClose() {
    setError(null);
    setSearch("");
    setStudentId("");
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = enrollSchema.safeParse({ studentId, classId, startBatchNumber });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }

    startTransition(async () => {
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
            Tìm học sinh
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            placeholder="Tên hoặc mã HS"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Học sinh <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="">-- Chọn học sinh --</option>
            {filtered.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Bắt đầu học từ Đợt <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={startBatchNumber}
            onChange={(e) => setStartBatchNumber(Number(e.target.value))}
          >
            {BATCH_NUMBERS.map((n) => (
              <option key={n} value={n}>
                Đợt {n}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Hệ thống chỉ tính học phí từ đợt này trở đi, không tính nợ các đợt trước.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            Huỷ
          </Button>
          <Button type="submit" disabled={isPending || !studentId}>
            {isPending ? "Đang lưu..." : "Ghi Danh"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
