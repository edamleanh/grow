"use client";

import { useTransition } from "react";
import { setActiveAcademicYearId } from "@/lib/academic-year";

type AcademicYear = { id: string; label: string };

export function AcademicYearSelector({
  years,
  activeYearId,
}: {
  years: AcademicYear[];
  activeYearId: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 disabled:opacity-50"
      value={activeYearId ?? ""}
      disabled={isPending}
      onChange={(event) => {
        const value = event.target.value;
        if (value) startTransition(() => setActiveAcademicYearId(value));
      }}
    >
      {years.length === 0 && <option value="">Chưa có năm học</option>}
      {years.map((year) => (
        <option key={year.id} value={year.id}>
          {year.label}
        </option>
      ))}
    </select>
  );
}
