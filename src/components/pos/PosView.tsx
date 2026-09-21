"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { ReceiptPrintModal, type PrintableReceipt } from "@/components/pos/ReceiptPrintModal";
import { searchStudents, getStudentPaymentOverview, createReceipt, getDebtReport } from "@/app/(dashboard)/pos/actions";
import { createReceiptSchema } from "@/components/pos/pos-schema";
import { formatDong, thousandsToDong, dongToThousands } from "@/lib/currency";
import type { BatchPaymentTone } from "@/lib/payment-status";

type StudentOption = { id: string; code: string; fullName: string; phone: string | null };
type OverviewGroup = Awaited<ReturnType<typeof getStudentPaymentOverview>>[number];
type ClassOption = { id: string; name: string };

const TONE_MAP: Record<BatchPaymentTone, { tone: StatusTone; label: string }> = {
  paid: { tone: "green", label: "Đã đóng" },
  current: { tone: "yellow", label: "Đợt hiện tại" },
  upcoming: { tone: "blue", label: "Sắp tới" },
  overdue: { tone: "red", label: "Nợ quá hạn" },
};

export function PosView({ classes }: { classes: ClassOption[] }) {
  const [tab, setTab] = useState<"payment" | "debt">("payment");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">POS Thu Tiền Học Phí</h1>
      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("payment")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "payment" ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Thu Tiền
        </button>
        <button
          type="button"
          onClick={() => setTab("debt")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "debt" ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Tra Cứu Báo Cáo Nợ Phí
        </button>
      </div>

      {tab === "payment" && <PaymentPanel />}
      {tab === "debt" && <DebtReportPanel classes={classes} />}
    </div>
  );
}

function PaymentPanel() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | undefined>(undefined);
  const [groups, setGroups] = useState<OverviewGroup[]>([]);
  const [selected, setSelected] = useState<Record<string, { classId: string; amountThousands: number }>>({});
  const [receiptType, setReceiptType] = useState<"PRINTED" | "MANUAL">("PRINTED");
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [printableReceipt, setPrintableReceipt] = useState<PrintableReceipt | undefined>(undefined);
  const [isSearching, startSearch] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();

  function handleSearchChange(value: string) {
    setSearch(value);
    if (value.trim().length < 1) {
      setResults([]);
      return;
    }
    startSearch(async () => {
      const rows = await searchStudents(value.trim());
      setResults(rows);
    });
  }

  function selectStudent(student: StudentOption) {
    setSelectedStudent(student);
    setResults([]);
    setSearch(`${student.code} — ${student.fullName}`);
    setSelected({});
    startSearch(async () => {
      const overview = await getStudentPaymentOverview(student.id);
      setGroups(overview);
    });
  }

  function toggleBatch(classId: string, batchId: string, outstandingDong: number) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[batchId]) {
        delete next[batchId];
      } else {
        next[batchId] = { classId, amountThousands: dongToThousands(outstandingDong) };
      }
      return next;
    });
  }

  function updateAmount(batchId: string, thousands: number) {
    setSelected((prev) => ({ ...prev, [batchId]: { ...prev[batchId], amountThousands: thousands } }));
  }

  const totalDong = Object.values(selected).reduce(
    (sum, item) => sum + thousandsToDong(item.amountThousands),
    0,
  );
  const hasFirstPaymentWarning = groups.some(
    (g) => g.isFirstPayment && g.batches.some((b) => selected[b.batchId]),
  );

  function handleSubmit() {
    if (!selectedStudent) return;
    setError(null);

    const items = Object.entries(selected).map(([batchId, v]) => ({
      classId: v.classId,
      batchId,
      amount: thousandsToDong(v.amountThousands),
    }));

    const parsed = createReceiptSchema.safeParse({
      studentId: selectedStudent.id,
      receiptType,
      manualReceiptCode: manualCode,
      items,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }

    startSubmit(async () => {
      try {
        const receipt = await createReceipt(parsed.data);
        setPrintableReceipt(receipt);
        setSelected({});
        setManualCode("");
        const overview = await getStudentPaymentOverview(selectedStudent.id);
        setGroups(overview);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Tìm Kiếm & Chọn Học Sinh</h2>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          placeholder="Tên / SĐT / Mã HS"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        {isSearching && <p className="mt-2 text-xs text-slate-400">Đang tìm...</p>}
        {results.length > 0 && (
          <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {results.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                  onClick={() => selectStudent(s)}
                >
                  <div className="font-medium text-slate-900">{s.fullName}</div>
                  <div className="text-xs text-slate-400">
                    {s.code} · {s.phone || "Chưa có SĐT"}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {hasFirstPaymentWarning && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            ⚠️ Học sinh đóng phí lần đầu cho lớp này — kiểm tra giảm giá/trừ tiền học giữa chừng.
          </div>
        )}
      </Card>

      <Card className="lg:col-span-1">
        <h2 className="mb-3 text-sm font-medium text-slate-700">12 Đợt Học Phân Theo Lớp</h2>
        {!selectedStudent && <p className="text-sm text-slate-400">Chọn học sinh để xem đợt học.</p>}
        {selectedStudent && groups.length === 0 && (
          <p className="text-sm text-slate-400">Học sinh chưa ghi danh lớp nào.</p>
        )}
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.enrollmentId}>
              <div className="mb-1 text-sm font-medium text-slate-800">
                {g.className} <span className="text-xs text-slate-400">({g.subjectName})</span>
                {!g.isActive && <span className="ml-1 text-xs text-slate-400">— đã kết thúc ở lớp này</span>}
              </div>
              <div className="space-y-1">
                {g.batches.map((b) => {
                  const badge = TONE_MAP[b.tone];
                  const isChecked = Boolean(selected[b.batchId]);
                  const canSelect = b.outstanding > 0;
                  return (
                    <div
                      key={b.batchId}
                      className="flex items-center gap-2 rounded-md border border-slate-100 px-2 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        disabled={!canSelect}
                        checked={isChecked}
                        onChange={() => toggleBatch(g.classId, b.batchId, b.outstanding)}
                      />
                      <span className="w-16 text-slate-600">{b.batchName}</span>
                      <StatusBadge tone={badge.tone} label={badge.label} />
                      <span className="ml-auto text-xs text-slate-400">
                        {formatDong(b.paid)}/{formatDong(b.fee)}
                      </span>
                      {isChecked && (
                        <input
                          type="number"
                          className="ml-2 w-20 rounded border border-slate-200 px-1.5 py-0.5 text-right text-xs"
                          value={selected[b.batchId].amountThousands}
                          onChange={(e) => updateAmount(b.batchId, Number(e.target.value))}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="lg:col-span-1">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Lập Biên Lai & In Phiếu Thu</h2>
        <div className="space-y-3">
          <div className="flex gap-2">
            <label className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                checked={receiptType === "PRINTED"}
                onChange={() => setReceiptType("PRINTED")}
              />
              In Máy
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                checked={receiptType === "MANUAL"}
                onChange={() => setReceiptType("MANUAL")}
              />
              Nhập Tay
            </label>
          </div>
          {receiptType === "MANUAL" && (
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="Mã biên lai từ cuống sổ"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
          )}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
            <span className="text-slate-500">Tổng tiền</span>
            <span className="text-lg font-semibold text-brand-700">{formatDong(totalDong)}</span>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            className="w-full"
            disabled={!selectedStudent || totalDong <= 0 || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Đang xử lý..." : "Xác Nhận Thu Tiền & In Phiếu Thu"}
          </Button>
        </div>
      </Card>

      <ReceiptPrintModal
        open={Boolean(printableReceipt)}
        onClose={() => setPrintableReceipt(undefined)}
        receipt={printableReceipt}
      />
    </div>
  );
}

function DebtReportPanel({ classes }: { classes: ClassOption[] }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [batchNumber, setBatchNumber] = useState(1);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getDebtReport>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoad] = useTransition();

  function handleLookup() {
    setError(null);
    if (!classId) return;
    startLoad(async () => {
      try {
        const result = await getDebtReport(classId, batchNumber);
        setRows(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Lớp học</label>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Đợt học</label>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={batchNumber}
            onChange={(e) => setBatchNumber(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Đợt {n}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={handleLookup} disabled={isLoading || !classId}>
          {isLoading ? "Đang tải..." : "Tra Cứu"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Mã HS</th>
              <th className="px-4 py-2 font-medium">Họ tên</th>
              <th className="px-4 py-2 font-medium">Đã đóng / Học phí</th>
              <th className="px-4 py-2 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Chưa có dữ liệu — bấm Tra Cứu để xem.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const badge = TONE_MAP[r.tone];
              return (
                <tr key={r.studentId}>
                  <td className="px-4 py-2 text-slate-500">{r.studentCode}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">{r.studentName}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {formatDong(r.paid)} / {formatDong(r.fee)}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge tone={badge.tone} label={badge.label} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
