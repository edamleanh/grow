"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { transferSchema } from "@/components/classes/enrollment-schema";
import { transferStudent, getClassBatchNames } from "@/app/(dashboard)/classes/enrollment-actions";

type ClassOption = { id: string; name: string };
type BatchOption = { batchNumber: number; name: string };

export function TransferStudentModal({
  open,
  onClose,
  enrollmentId,
  currentClassId,
  currentClassName,
  defaultEndBatchNumber,
  targetClasses,
}: {
  open: boolean;
  onClose: () => void;
  enrollmentId: string;
  currentClassId: string;
  currentClassName: string;
  defaultEndBatchNumber: number;
  targetClasses: ClassOption[];
}) {
  const [endBatchNumber, setEndBatchNumber] = useState(defaultEndBatchNumber);
  const [targetClassId, setTargetClassId] = useState(targetClasses[0]?.id ?? "");
  const [startBatchNumber, setStartBatchNumber] = useState(defaultEndBatchNumber + 1 > 12 ? 1 : defaultEndBatchNumber + 1);
  const [currentClassBatches, setCurrentClassBatches] = useState<BatchOption[]>([]);
  const [targetClassBatches, setTargetClassBatches] = useState<BatchOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Show the real batch names (edited via modal-batch-form) instead of a
  // generic "Đợt {n}" — see edumanager-ops/BatchFormModal.
  useEffect(() => {
    if (!open || !currentClassId) return;
    getClassBatchNames(currentClassId).then(setCurrentClassBatches);
  }, [open, currentClassId]);

  useEffect(() => {
    if (!targetClassId) return;
    getClassBatchNames(targetClassId).then(setTargetClassBatches);
  }, [targetClassId]);

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = transferSchema.safeParse({
      enrollmentId,
      endBatchNumber,
      targetClassId,
      startBatchNumber,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }

    startTransition(async () => {
      try {
        await transferStudent(parsed.data);
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Chuyển Lớp — Đang học tại ${currentClassName}`}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Học hết Đợt (ở {currentClassName}) <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={endBatchNumber}
            onChange={(e) => setEndBatchNumber(Number(e.target.value))}
          >
            {currentClassBatches.map((b) => (
              <option key={b.batchNumber} value={b.batchNumber}>
                {b.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Nợ phí các đợt đã học ở {currentClassName} (bao gồm đợt này) sẽ được bảo lưu, không bị xoá.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Chuyển sang Lớp <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={targetClassId}
            onChange={(e) => setTargetClassId(e.target.value)}
          >
            <option value="">-- Chọn lớp mới --</option>
            {targetClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Bắt đầu học ở lớp mới từ Đợt <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={startBatchNumber}
            onChange={(e) => setStartBatchNumber(Number(e.target.value))}
            disabled={targetClassBatches.length === 0}
          >
            {targetClassBatches.map((b) => (
              <option key={b.batchNumber} value={b.batchNumber}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            Huỷ
          </Button>
          <Button type="submit" disabled={isPending || !targetClassId}>
            {isPending ? "Đang lưu..." : "Xác Nhận Chuyển Lớp"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
