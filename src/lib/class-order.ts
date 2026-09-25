// Sắp xếp lớp theo môn, rồi khối (số, không phải chuỗi — tránh lỗi
// "1, 10, 11, 12, 2, 3..." của string sort), rồi chữ cái cuối tên lớp (VD
// "Anh Văn 6A" / "Anh Văn 6O") với "O" luôn đứng đầu, sau đó mới tới A, B,
// C, D... (dùng cho module In Danh Sách — trang chọn lớp + thứ tự block
// trong file Excel xuất ra).

function sectionLetter(name: string): string | null {
  const last = name.trim().slice(-1);
  return /^[A-Z]$/.test(last) ? last : null;
}

function sectionRank(letter: string | null): number {
  if (letter === null) return 0;
  if (letter === "O") return -1;
  return letter.charCodeAt(0);
}

export function compareClassesBySection(a: { name: string; grade: number }, b: { name: string; grade: number }): number {
  if (a.grade !== b.grade) return a.grade - b.grade;
  return sectionRank(sectionLetter(a.name)) - sectionRank(sectionLetter(b.name));
}

export function sortClassesBySection<T extends { name: string; grade: number; subject: { name: string } }>(
  classes: T[],
): T[] {
  return [...classes].sort(
    (a, b) => a.subject.name.localeCompare(b.subject.name, "vi") || compareClassesBySection(a, b),
  );
}
