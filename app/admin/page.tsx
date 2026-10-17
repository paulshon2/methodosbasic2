import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/admin-panel";
import { checkClerkAdmin } from "@/lib/admin/clerk-admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "인증키 관리 — Methodos Basic", robots: { index: false, follow: false } };

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-ink-2">{children}</div>
      <Link href="/" className="mt-6 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">홈으로</Link>
    </div>
  );
}

export default async function AdminPage() {
  const check = await checkClerkAdmin();

  if (check.state === "signed_out") redirect("/login?redirect_url=/admin");
  if (check.state === "ok") return <AdminPanel mode="session" who={check.admin.email} />;

  if (check.state === "not_configured") {
    return (
      <Notice title="Clerk가 설정되지 않았습니다">
        <p>Vercel 환경변수 <code className="text-xs">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> · <code className="text-xs">CLERK_SECRET_KEY</code> 를 추가한 뒤 재배포하세요.</p>
      </Notice>
    );
  }
  if (check.state === "no_admin_list") {
    return (
      <Notice title="관리자 목록이 비어 있습니다">
        <p>Vercel 환경변수 <code className="text-xs">ADMIN_EMAILS</code> 또는 <code className="text-xs">ADMIN_PHONES</code> 에 관리자의 이메일·휴대폰 번호를 쉼표로 구분해 넣고 재배포하세요. (목록이 비어 있으면 아무도 들어올 수 없습니다.)</p>
      </Notice>
    );
  }
  return (
    <Notice title="접근 권한이 없습니다">
      <p><strong className="text-ink">{check.email}</strong> 계정은 관리자 목록에 없습니다.</p>
      <p>관리자 계정으로 다시 로그인하세요.</p>
    </Notice>
  );
}
