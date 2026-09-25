"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Option = { id: string; name: string };
type ClassRow = {
  id: string;
  name: string;
  grade: number;
  subjectName: string;
  teacherName: string;
  studentCount: number;
};

export function PrintRosterView({
  classes,
  subjects,
}: {
  classes: ClassRow[];
  subjects: Option[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const subjectFilter = searchParams.get("subjectId") ?? "";
  const gradeFilter = searchParams.get("grade") ?? "";

  function updateFilter(key: "subjectId" | "grade", value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/print-roster?${params.toString()}`);
  }

  function toggleClass(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === classes.length ? new Set() : new Set(classes.map((c) => c.id))));
  }

  const grouped = useMemo(() => {
    return classes.reduce<Record<string, ClassRow[]>>((groups, cls) => {
      (groups[cls.subjectName] ??= []).push(cls);
      return groups;
    }, {});
  }, [classes]);

  const allChecked = classes.length > 0 && selected.size === classes.length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">In Danh Sách</h1>
      <p className="text-sm text-slate-500">
        Chọn các lớp cần xuất — hệ thống tạo 1 file Excel gồm bảng Tổng Quan và
        danh sách học sinh riêng cho từng lớp.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          value={subjectFilter}
          onChange={(e) => updateFilter("subjectId", e.target.value)}
        >
          <option value="">Tất cả môn</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          value={gradeFilter}
          onChange={(e) => updateFilter("grade", e.target.value)}
        >
          <option value="">Tất cả khối</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
            <option key={g} value={g}>
              Khối {g}
            </option>
          ))}
        </select>
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={allChecked} onChange={toggleAll} />
          Chọn tất cả ({classes.length})
        </label>
      </div>

      <form action="/api/print-roster" method="POST">
        {[...selected].map((id) => (
          <input key={id} type="hidden" name="classIds" value={id} />
        ))}

        <div className="max-h-[28rem] space-y-4 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
          {classes.length === 0 && (
            <p className="text-sm text-slate-400">Không có lớp nào phù hợp bộ lọc.</p>
          )}
          {Object.entries(grouped).map(([subjectName, classesInSubject]) => (
            <div key={subjectName}>
              <div className="mb-2 text-sm font-semibold text-slate-700">{subjectName}</div>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
                {classesInSubject.map((cls) => (
                  <label key={cls.id} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={selected.has(cls.id)}
                      onChange={() => toggleClass(cls.id)}
                    />
                    <span>
                      {cls.name} — {cls.teacherName}{" "}
                      <span className="text-xs text-slate-400">({cls.studentCount})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">Đã chọn {selected.size} lớp</span>
          <Button type="submit" disabled={selected.size === 0}>
            Xuất Excel
          </Button>
        </div>
      </form>
    </div>
  );
}
