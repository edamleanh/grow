// Money is persisted as whole VNĐ (Int) but the UI enters/displays amounts in
// "nghìn VNĐ" (thousands) per requirements.md, e.g. input "350" => 350_000đ.
// Centralize the conversion here — see .claude/skills/web-development/SKILL.md.

export function thousandsToDong(thousands: number): number {
  return Math.round(thousands * 1000);
}

export function dongToThousands(dong: number): number {
  return Math.round(dong / 1000);
}

export function formatDong(dong: number): string {
  return new Intl.NumberFormat("vi-VN").format(dong) + " VNĐ";
}
