"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { runYearEndPromotion, type getPromotionPreview } from "@/app/(dashboard)/year-end-promotion/actions";

type Preview = Awaited<ReturnType<typeof getPromotionPreview>>;

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-brand-700">{value}</div>
    </div>
  );
}

export function YearEndPromotionView({ preview }: { preview: Preview }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof runYearEndPromotion>> | null>(null);
  const [isRunning, startRun] = useTransition();

  if (!preview.sourceYear) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Lên Lớp / Kết Chuyển Niên Khóa</h1>
        <p className="text-sm text-slate-400">Chưa có năm học nào đang hoạt động.</p>
      </div>
    );
  }

  const { sourceYear, targetLabel, alreadyPromoted, promotedAt } = preview;
  const expectedConfirmText = targetLabel;

  function handleConfirm() {
    setError(null);
    startRun(async () => {
      try {
        const r = await runYearEndPromotion();
        setResult(r);
        setConfirmOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  if (result) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Lên Lớp / Kết Chuyển Niên Khóa</h1>
        <Card className="border-brand-200 bg-brand-50">
          <h2 className="mb-2 text-lg font-semibold text-brand-700">
            ✅ Đã kết chuyển sang niên khóa {result.targetLabel}
          </h2>
          <ul className="space-y-1 text-sm text-slate-700">
            <li>Đã tạo {result.classesCloned} lớp mới (tăng khối từ lớp cũ)</li>
            <li>Đã tăng khối cho {result.studentsPromoted} học sinh</li>
            <li>Đã tốt nghiệp {result.studentsGraduated} học sinh (Khối 12)</li>
            <li>Đã kết chuyển {result.enrollmentsCarriedOver} lượt ghi danh sang lớp mới</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Năm học đang hoạt động đã tự chuyển sang {result.targetLabel}. Đổi lại ở bộ chọn năm học
            trên header nếu cần xem dữ liệu năm cũ.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Lên Lớp / Kết Chuyển Niên Khóa</h1>
      <p className="text-sm text-slate-500">
        Kết chuyển từ niên khóa <strong>{sourceYear.label}</strong> sang{" "}
        <strong>{targetLabel}</strong>: tăng khối học sinh, tốt nghiệp Khối 12, nhân bản lớp học
        (Khối 1-11) sang năm mới, kết chuyển ghi danh. Thao tác này không thể hoàn tác.
      </p>

      {alreadyPromoted ? (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            ⚠️ Niên khóa {sourceYear.label} đã được kết chuyển vào{" "}
            {promotedAt ? new Date(promotedAt).toLocaleString("vi-VN") : ""}. Không thể chạy lại.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Học sinh sẽ tăng khối" value={preview.studentsToPromote} />
            <StatCard label="Học sinh sẽ tốt nghiệp" value={preview.studentsGraduating} />
            <StatCard label="Lớp sẽ nhân bản (Khối 1-11)" value={preview.classesToClone} />
            <StatCard label="Lớp Khối 12 sẽ lưu trữ" value={preview.classesGraduating} />
            <StatCard label="Lượt ghi danh kết chuyển" value={preview.activeEnrollments} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Lên Lớp / Kết Chuyển Niên Khóa
          </Button>
        </>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Xác Nhận Kết Chuyển Niên Khóa">
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Hành động này sẽ tăng khối <strong>{preview.studentsToPromote}</strong> học sinh, tốt
            nghiệp <strong>{preview.studentsGraduating}</strong> học sinh, tạo{" "}
            <strong>{preview.classesToClone}</strong> lớp mới cho niên khóa {targetLabel}. Không thể
            hoàn tác. Gõ đúng <strong>{expectedConfirmText}</strong> để xác nhận.
          </p>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={expectedConfirmText}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)} disabled={isRunning}>
              Huỷ
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={confirmText !== expectedConfirmText || isRunning}
              onClick={handleConfirm}
            >
              {isRunning ? "Đang xử lý..." : "Xác Nhận, Kết Chuyển Ngay"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
