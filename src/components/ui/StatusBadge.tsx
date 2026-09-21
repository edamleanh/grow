// Shared status color coding across the app (requirements.md §4.6):
// green = paid/open/active, yellow = current/in-progress, blue = upcoming,
// red = overdue/graduated-alert. See .claude/skills/web-development/SKILL.md.

export type StatusTone = "green" | "yellow" | "blue" | "red" | "gray";

const TONE_CLASSES: Record<StatusTone, string> = {
  green: "bg-emerald-100 text-emerald-700",
  yellow: "bg-amber-100 text-amber-700",
  blue: "bg-sky-100 text-sky-700",
  red: "bg-red-100 text-red-700",
  gray: "bg-slate-100 text-slate-600",
};

export function StatusBadge({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
