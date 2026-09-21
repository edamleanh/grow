"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatDong } from "@/lib/currency";

// modal-receipt-print (requirements.md §4.7): standard printable receipt
// summary shown right after confirming payment.
export type PrintableReceipt = {
  studentName: string;
  studentCode: string;
  receiptCode: string;
  issuedAt: string;
  receiptType: "PRINTED" | "MANUAL";
  manualReceiptCode?: string;
  items: { className: string; batchName: string; amount: number }[];
  totalAmount: number;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function ReceiptPrintModal({
  open,
  onClose,
  receipt,
}: {
  open: boolean;
  onClose: () => void;
  receipt?: PrintableReceipt;
}) {
  if (!receipt) return null;

  return (
    <Modal open={open} onClose={onClose} title="Phiếu Thu Tiền Học Phí">
      <div className="space-y-3 text-sm">
        <div className="text-center">
          <div className="font-semibold text-brand-700">Trung Tâm Ngoại Ngữ Grow</div>
          <div className="text-slate-500">
            {receipt.receiptType === "PRINTED" ? `Mã BL: ${receipt.receiptCode}` : `Mã tay: ${receipt.manualReceiptCode}`}
          </div>
          <div className="text-slate-400">{formatDateTime(receipt.issuedAt)}</div>
        </div>
        <div className="border-t border-slate-200 pt-3">
          <div>
            Học sinh: <span className="font-medium">{receipt.studentName}</span> ({receipt.studentCode})
          </div>
        </div>
        <table className="w-full border-t border-slate-200 pt-2 text-left">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 font-medium">Lớp - Đợt</th>
              <th className="py-1 text-right font-medium">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item, idx) => (
              <tr key={idx} className="border-t border-slate-100">
                <td className="py-1">
                  {item.className} - {item.batchName}
                </td>
                <td className="py-1 text-right">{formatDong(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
          <span>Tổng cộng</span>
          <span className="text-brand-700">{formatDong(receipt.totalAmount)}</span>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Đóng</Button>
        </div>
      </div>
    </Modal>
  );
}
