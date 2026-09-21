import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

// Seeds the standard subject catalog + fee defaults from requirements.md §2.4
// (Văn = 300.000đ/đợt, other subjects = 350.000đ/đợt) and one initial
// Academic Year. Run with: npx prisma db seed

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SUBJECTS: { name: string; defaultFeePerBatch: number }[] = [
  { name: "Toán", defaultFeePerBatch: 350_000 },
  { name: "Lý", defaultFeePerBatch: 350_000 },
  { name: "Hóa", defaultFeePerBatch: 350_000 },
  { name: "Văn", defaultFeePerBatch: 300_000 },
  { name: "Anh Văn", defaultFeePerBatch: 350_000 },
  { name: "GVNN", defaultFeePerBatch: 350_000 },
];

async function main() {
  for (const subject of SUBJECTS) {
    await prisma.subject.upsert({
      where: { name: subject.name },
      update: { defaultFeePerBatch: subject.defaultFeePerBatch },
      create: subject,
    });
  }

  await prisma.academicYear.upsert({
    where: { label: "2025-2026" },
    update: {},
    create: {
      label: "2025-2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-06-30"),
      isActive: true,
    },
  });

  // requirements.md has no real login flow — role-switching is done via the
  // header "Quick Switcher" (demo mode). It needs one User row per role to
  // attach as createdByUserId on receipts / teacherId on the Teacher role.
  // See .claude/skills/edumanager-ops/SKILL.md §0 and src/lib/auth.ts.
  const mathSubject = await prisma.subject.findUniqueOrThrow({ where: { name: "Toán" } });

  const demoTeacher = await prisma.teacher.upsert({
    where: { code: "GV001" },
    update: {},
    create: {
      code: "GV001",
      fullName: "Nguyễn Văn Demo",
      subjectId: mathSubject.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@grow.local" },
    update: {},
    create: { email: "admin@grow.local", fullName: "Admin Demo", role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "cashier@grow.local" },
    update: {},
    create: { email: "cashier@grow.local", fullName: "Thu Ngân Demo", role: "CASHIER" },
  });
  await prisma.user.upsert({
    where: { email: "teacher@grow.local" },
    update: {},
    create: {
      email: "teacher@grow.local",
      fullName: demoTeacher.fullName,
      role: "TEACHER",
      teacherId: demoTeacher.id,
    },
  });

  console.log("Seed complete: subjects + academic year + demo users (Admin/Cashier/Teacher).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
