// Sắp xếp lớp theo tên, nhưng đảo thứ tự chữ cái cuối (tên nhóm lớp, VD "Anh
// Văn 6A" / "Anh Văn 6O") để lớp "O" luôn đứng đầu, sau đó mới tới A, B, C,
// D... (dùng cho module In Danh Sách — trang chọn lớp + thứ tự block trong
// file Excel xuất ra).

function extractSection(name: string): { prefix: string; letter: string | null } {
  const trimmed = name.trim();
  const last = trimmed.slice(-1);
  if (/^[A-Z]$/.test(last)) {
    return { prefix: trimmed.slice(0, -1), letter: last };
  }
  return { prefix: trimmed, letter: null };
}

function sectionRank(letter: string | null): number {
  if (letter === null) return 0;
  if (letter === "O") return -1;
  return letter.charCodeAt(0);
}

export function compareClassesBySection(a: { name: string }, b: { name: string }): number {
  const sectionA = extractSection(a.name);
  const sectionB = extractSection(b.name);
  const prefixCompare = sectionA.prefix.localeCompare(sectionB.prefix, "vi");
  if (prefixCompare !== 0) return prefixCompare;
  return sectionRank(sectionA.letter) - sectionRank(sectionB.letter);
}

export function sortClassesBySection<T extends { name: string; subject: { name: string } }>(
  classes: T[],
): T[] {
  return [...classes].sort(
    (a, b) => a.subject.name.localeCompare(b.subject.name, "vi") || compareClassesBySection(a, b),
  );
}
