import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPromotionPreview } from "./actions";
import { YearEndPromotionView } from "@/components/year-end-promotion/YearEndPromotionView";

// Lên Lớp / Kết Chuyển Niên Khóa (requirements.md §2.1) — Admin-only, "chủ
// trung tâm" (§1.3).
export default async function YearEndPromotionPage() {
  const currentUser = await getCurrentUser();
  if (currentUser.role !== "ADMIN") {
    redirect("/pos");
  }

  const preview = await getPromotionPreview();

  return <YearEndPromotionView preview={preview} />;
}
