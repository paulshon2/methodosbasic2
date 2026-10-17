import { notFound } from "next/navigation";
import { AdminPanel } from "@/components/admin/admin-panel";

export const dynamic = "force-dynamic";

/**
 * 개발용 미리보기 — 관리자 토큰을 직접 입력해 화면을 시험한다.
 * 운영 빌드(NODE_ENV=production)에서는 존재하지 않는 페이지다(404).
 * 로컬에서 운영 빌드로 시험할 때만 ADMIN_PREVIEW=1 로 열 수 있다.
 */
export default function AdminPreview() {
  if (process.env.NODE_ENV === "production" && process.env.ADMIN_PREVIEW !== "1") notFound();
  return <AdminPanel mode="token" />;
}
