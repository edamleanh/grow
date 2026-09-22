// Vietnamese class rosters are conventionally alphabetized by "Tên" (the
// given/call name — the last word), not by "Họ" (family name) — e.g.
// "Nguyễn Văn An" and "Trần Thị An" both sort together under "A". Node's
// Intl.Collator("vi") already knows the correct Vietnamese letter order
// (a, ă, â, b, c, d, đ, e, ê, ... ư, v, x, y) including tone marks.

const vietnameseCollator = new Intl.Collator("vi", { sensitivity: "base" });

export function givenName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

export function sortByVietnameseGivenName<T>(items: T[], getFullName: (item: T) => string): T[] {
  return [...items].sort((a, b) =>
    vietnameseCollator.compare(givenName(getFullName(a)), givenName(getFullName(b))),
  );
}
