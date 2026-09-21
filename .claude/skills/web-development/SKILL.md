---
name: web-development
description: Next.js/React/TypeScript/Tailwind conventions and UI structure for EduManager V2. Use whenever creating pages, components, API routes, forms, or modals in the app; and whenever styling anything (colors, layout, typography) to keep the Emerald light-mode brand consistent.
---

# Web Development — EduManager V2 (Next.js App)

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS, `src/` directory, `@/*` import alias.
- Data layer: Prisma client (see [database-design](../database-design/SKILL.md)) called from Server Components / Route Handlers — do not call Prisma from Client Components.
- Prefer Server Components + Server Actions for data mutations (form submits, POS transactions) over client-side fetch where possible; use Client Components only for interactivity (modals, live search, Quick Switcher).

## Brand & theme (must follow — see requirements.md §1.4)
- Brand name shown in header: "Trung Tâm Ngoại Ngữ Grow".
- Light mode only for V2 — do not add a dark mode toggle unless asked.
- Primary color: Emerald. Use Tailwind's `emerald` palette as the primary; map `emerald-600` (#059669) as the default primary action color and `emerald-500` (#10B981) as accent/hover. Define these as CSS variables or Tailwind `theme.extend.colors.brand` so the exact hexes stay centralized instead of scattered literals.
- Keep visual style clean/modern/professional — generous whitespace, rounded-lg cards, subtle shadows, no heavy gradients.

## App structure convention
```
src/
  app/
    (dashboard)/                 # authenticated admin/cashier/teacher shell
      layout.tsx                 # sidebar + header + Academic Year selector + Quick Switcher
      page.tsx                   # Dashboard (Module 1)
      students/
        page.tsx                 # list (Module 2)
        [studentId]/page.tsx     # detail full-page, tabs: Enrollments / Receipts
      classes/
        page.tsx                 # list (Module 3)
        [classId]/page.tsx       # detail full-page, tabs: 12 Batches / Students
      teachers/
        page.tsx                 # list (Module 4)
        [teacherId]/page.tsx     # detail full-page, tabs: Classes / Payroll
      pos/
        page.tsx                 # POS (Module 5), tab: Payment / Debt Report
    api/                         # Route Handlers for mutations not covered by Server Actions
  components/
    ui/                          # generic primitives (Button, Card, Table, Tabs, Modal...)
    students/ classes/ teachers/ pos/   # feature-specific components
  lib/
    prisma.ts                    # singleton PrismaClient
    auth.ts                      # current user/role resolution
    rbac.ts                      # role guard helpers used in Server Actions/Route Handlers
    academic-year.ts             # helper to read/write the active academic year (cookie or query param)
  types/
```

## Modals (map 1:1 to requirements.md §4.7 — keep these IDs/names when building)
| Modal | Component | Trigger |
| --- | --- | --- |
| `modal-student-form` | `components/students/StudentFormModal.tsx` | Add/edit student |
| `modal-class-form` | `components/classes/ClassFormModal.tsx` | Create class (auto-generates 12 batches) |
| `modal-teacher-form` | `components/teachers/TeacherFormModal.tsx` | Add/edit teacher |
| `modal-batch-form` | `components/classes/BatchFormModal.tsx` | Edit one batch's name/teacher/fee |
| `modal-receipt-print` | `components/pos/ReceiptPrintModal.tsx` | Print receipt after POS confirm |

## RBAC in the UI layer
- Read current user/role via `lib/auth.ts` in every server component that renders a protected page; redirect or hide nav items based on role (Admin/Cashier/Teacher — see [edumanager-ops](../edumanager-ops/SKILL.md) §0 and §8).
- The Quick Switcher (demo-only role switch in header) must be visibly a dev/demo affordance and must not be treated as real authentication — gate it behind an env flag (e.g. `NEXT_PUBLIC_ENABLE_QUICK_SWITCHER`) so it can be disabled for a real production deployment.
- **UI hiding is not enough.** Every Server Action / Route Handler that touches Class/Teacher/Student/Receipt/YearPromotion must re-check the role server-side via `lib/rbac.ts`, matching the enforcement rules in edumanager-ops §8.

## Forms & validation
- Use a schema validation library (zod) shared between client form and server action so validation rules aren't duplicated. Co-locate the zod schema with the feature (e.g. `components/students/student-schema.ts`) and import it from both the form and the Server Action.
- Required fields per requirements.md: Student fullName (required), phone (optional but recommended), grade 1-12; Teacher fullName (required), phone (optional); Class name/subject/academicYear/teacher/fee (required).
- Money inputs are entered/displayed in "nghìn VNĐ" (.000 VNĐ) per requirements.md UI spec (e.g. "350" meaning 350.000đ) — convert to whole đồng before persisting, and centralize this conversion in one helper (`lib/currency.ts`) instead of multiplying by 1000 inline in multiple places.

## Tables & lists
- List pages (Students/Classes/Teachers) need: search input (debounced), academic-year-aware filtering where applicable, and a link to the full-page detail view — match requirements.md §4.3/§4.4/§4.5 column sets exactly.
- Status badges use color coding consistently across the app: green = paid/open/active, yellow = current/in-progress, blue = upcoming, red = overdue/graduated-alert — reuse a single `<StatusBadge>` component rather than ad-hoc colored spans.

## POS screen (Module 5) specifics
- Batch cards grouped by class, colored per requirements.md §4.6: 🟢 Đã đóng, 🟡 Đợt hiện tại, 🔵 Sắp tới, 🔴 Nợ quá hạn — implement as a shared `getBatchPaymentStatus()` util (see database-design skill for the derivation logic) so POS and Debt Report tab use identical logic.
- The "first payment for this class" banner must be computed server-side (query: does any ReceiptLineItem exist for this student+class already?) and passed down, not guessed on the client.
- Submitting a receipt with multiple line items across multiple classes/batches must be one atomic Server Action (`prisma.$transaction`) that creates the Receipt + all ReceiptLineItems together.

## When building a new page/feature
1. Check [edumanager-ops](../edumanager-ops/SKILL.md) for the business rule first.
2. Check [database-design](../database-design/SKILL.md) for the exact schema shape before writing queries.
3. Reuse existing `components/ui/*` primitives before creating new ones.
4. Keep the Emerald/light theme consistent — no ad-hoc hex colors outside the theme config.
