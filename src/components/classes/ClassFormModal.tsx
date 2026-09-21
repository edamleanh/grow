"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { classSchema } from "@/components/classes/class-schema";
import { createClass, updateClass } from "@/app/(dashboard)/classes/actions";
import { dongToThousands, thousandsToDong } from "@/lib/currency";

type Option = { id: string; name: string };
type Subject = Option & { defaultFeePerBatch: number };
type ClassRecord = {
  id: string;
  name: string;
  grade: number;
  subjectId: string;
  academicYearId: string;
  primaryTeacherId: string;
  feePerBatch: number;
};

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export function ClassFormModal({
  open,
  onClose,
  subjects,
  academicYears,
  teachers,
  activeAcademicYearId,
  klass,
}: {
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  academicYears: Option[];
  teachers: Option[];
  activeAcademicYearId: string | null;
  klass?: ClassRecord;
}) {
  const isEdit = Boolean(klass);
  const [name, setName] = useState(klass?.name ?? "");
  const [grade, setGrade] = useState(klass?.grade ?? 1);
  const [subjectId, setSubjectId] = useState(klass?.subjectId ?? subjects[0]?.id ?? "");
  const [academicYearId, setAcademicYearId] = useState(
    klass?.academicYearId ?? activeAcademicYearId ?? academicYears[0]?.id ?? "",
  );
  const [primaryTeacherId, setPrimaryTeacherId] = useState(
    klass?.primaryTeacherId ?? teachers[0]?.id ?? "",
  );
  const [feeThousands, setFeeThousands] = useState(
    klass ? dongToThousands(klass.feePerBatch) : dongToThousands(subjects[0]?.defaultFeePerBatch ?? 350_000),
  );
  const [feeTouched, setFeeTouched] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubjectChange(newSubjectId: string) {
    setSubjectId(newSubjectId);
    if (!feeTouched) {
      const subject = subjects.find((s) => s.id === newSubjectId);
      if (subject) setFeeThousands(dongToThousands(subject.defaultFeePerBatch));
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = classSchema.safeParse({
      name,
      grade,
      subjectId,
      academicYearId,
      primaryTeacherId,
      feePerBatch: thousandsToDong(feeThousands),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit && klass) {
          await updateClass(klass.id, parsed.data);
        } else {
          await createClass(parsed.data);
        }
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title={isEdit ? "Chỉnh Sửa Thông Tin Lớp" : "Tạo Lớp Học Mới"}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Tên lớp <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Toán 6A"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Khối <span className="text-red-500">*</span>
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
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Môn học <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Năm học <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              disabled={isEdit}
            >
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Giáo viên phụ trách <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              value={primaryTeacherId}
              onChange={(e) => setPrimaryTeacherId(e.target.value)}
            >
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Học phí / đợt (nghìn VNĐ) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={feeThousands}
            onChange={(e) => {
              setFeeTouched(true);
              setFeeThousands(Number(e.target.value));
            }}
            placeholder="VD: 350"
          />
        </div>
        {!isEdit && (
          <p className="text-xs text-slate-400">
            Hệ thống sẽ tự động tạo 12 đợt học cho lớp này.
          </p>
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
