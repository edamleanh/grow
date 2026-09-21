import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PosView } from "@/components/pos/PosView";

// Module 5: POS Thu Tiền Học Phí & Tra Cứu Nợ Phí (requirements.md §4.6) —
// available to Admin, Cashier, and Teacher (scoped to their own classes).
export default async function PosPage() {
  const currentUser = await getCurrentUser();

  const classes = await prisma.class.findMany({
    where:
      currentUser.role === "TEACHER" && currentUser.teacherId
        ? { primaryTeacherId: currentUser.teacherId }
        : undefined,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <PosView classes={classes} />;
}
