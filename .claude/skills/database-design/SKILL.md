---
name: database-design
description: Prisma schema and PostgreSQL (Supabase-hosted) conventions for EduManager V2. Use whenever creating or modifying prisma/schema.prisma, writing migrations, designing new tables/relations, or writing raw SQL/queries against the Supabase Postgres database.
---

# Database Design — EduManager V2 (Prisma + Supabase PostgreSQL)

## Stack
- ORM: Prisma (`prisma/schema.prisma`), provider `postgresql`.
- Hosting: Supabase Cloud Postgres. Connection via `DATABASE_URL` (pooled, port 6543, `pgbouncer=true`) for the app runtime, and `DIRECT_URL` (port 5432) for migrations — both env vars must be set (see `.env.example`).
- Both URLs need `sslmode=no-verify` — Supabase's pooler cert chain isn't in Node's default trust store, so plain `pg`/Prisma driver-adapter connections fail with "self-signed certificate in certificate chain" without it. The connection is still encrypted; this only skips CA validation. Prisma schema itself no longer holds a `url` (Prisma 7 moved it to `prisma.config.ts`, read via `env()`), and `src/lib/prisma.ts` passes `DATABASE_URL` to `@prisma/adapter-pg` at runtime.
- Never commit real Supabase credentials. `.env` is gitignored; only `.env.example` with placeholders is committed.
- Run `npx prisma migrate dev` locally against `DIRECT_URL`; deploy with `npx prisma migrate deploy` in CI/production.

## Core domain model (must match [edumanager-ops](../edumanager-ops/SKILL.md))
Design around these entities — read the edumanager-ops skill for the business rules behind each field before changing this shape:

- `AcademicYear` (id, label e.g. "2025-2026", start/end dates, `isActive`) — every Class belongs to exactly one.
- `Subject` (id, name, `defaultFeePerBatch`) — seed with Toán/Lý/Hóa/Văn/Anh Văn/GVNN; Văn defaults 300000, others 350000.
- `Teacher` (id, code e.g. GV001, fullName, phone nullable, subjectId).
- `Student` (id, code e.g. HS0001 auto-generated, fullName, phone, grade 1-12, status enum: `STUDYING` / `NO_CLASS` / `GRADUATED`, note text). Student is year-agnostic; do not add an `academicYearId` FK here.
- `Class` (id, name, subjectId, academicYearId, grade, primaryTeacherId, feePerBatch, status enum `OPEN`/`CLOSED`). Creating a Class must transactionally create exactly 12 `Batch` rows.
- `Batch` (id, classId, batchNumber 1-12, name, feePerBatch (can differ from class default), teacherId (can differ from class.primaryTeacherId), status enum `UPCOMING`/`ONGOING`/`COMPLETED`). Unique constraint on `(classId, batchNumber)`.
- `Enrollment` (id, studentId, classId, startBatchNumber, endBatchNumber nullable, enrolledAt, status). A student can have multiple Enrollment rows for the *same* class across non-contiguous batch ranges (e.g. batches 1-4, then later 6-9 again) — do NOT put a unique constraint on `(studentId, classId)`; the natural key is `(studentId, classId, startBatchNumber)`.
- `Receipt` (id, receiptCode auto for `PRINTED`, manualReceiptCode nullable for `MANUAL`, receiptType enum `PRINTED`/`MANUAL`, studentId, issuedAt timestamp, createdByUserId, totalAmount).
- `ReceiptLineItem` (id, receiptId, classId, batchId, amount). Always store both classId and batchId explicitly — never infer them later from context.
- `User` (id, email, role enum `ADMIN`/`CASHIER`/`TEACHER`, teacherId nullable FK when role=TEACHER).

## Conventions
- All monetary fields: `Int` storing VNĐ as whole đồng (no decimals; Vietnamese currency has no subunits in practice here) — do not use `Float` for money.
- All ids: `String @id @default(cuid())` unless there's a reason for auto-increment.
- Timestamps: `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt` on every table that can be edited.
- Enums: define as Prisma `enum`, not free-text strings, so invalid states are caught at the DB layer.
- Derive fee-payment-status (`Chưa đóng`/`Đóng thiếu`/`Đã đóng đủ`) at query time by summing `ReceiptLineItem.amount` grouped by `(studentId, classId, batchId)` — do not persist a redundant status column on Enrollment/Batch that can drift out of sync.
- Cascading deletes: never hard-delete Student/Class/Teacher/Receipt in normal operation (financial/audit data) — prefer soft-disable via status enums. If a `deletedAt` pattern is needed, add it explicitly and filter it in every query (Prisma middleware or a shared query helper).
- Index every foreign key used in dashboard/report filters: `academicYearId`, `classId`, `studentId`, `batchId`, `teacherId`.
- Wrap the Year-End Promotion (grade bump + class cloning + enrollment carry-over) in a single `prisma.$transaction([...])` — partial application is a data-integrity bug per edumanager-ops §2.

## Workflow when changing the schema
1. Edit `prisma/schema.prisma`.
2. `npx prisma format` then `npx prisma validate`.
3. `npx prisma migrate dev --name <short_description>` to generate + apply migration locally.
4. Update any seed script (`prisma/seed.ts`) if new required fields were added.
5. Regenerate the client is automatic via `postinstall`/`migrate dev`, but run `npx prisma generate` explicitly if only editing schema without migrating (e.g. generator changes).
6. Never hand-edit generated migration SQL unless fixing a failed migration — prefer a new migration.

## Supabase-specific notes
- Row Level Security (RLS) is NOT the primary auth boundary for V2 — access control is enforced in the Next.js API/server layer (see [web-development](../web-development/SKILL.md)) using the `User.role` field. If RLS is enabled on the Supabase project by default, service-role key must be used server-side, and RLS policies (if any) should not block legitimate app queries — coordinate rather than fighting policies with ad-hoc bypasses.
- Use Supabase only as managed Postgres for this project (Prisma as the only query layer) unless a feature explicitly needs Supabase Auth/Storage/Realtime — don't mix Supabase JS client queries and Prisma queries against the same tables to avoid divergent validation logic.
