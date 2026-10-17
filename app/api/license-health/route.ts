import { handle } from "@/lib/license/http";
import { getStore } from "@/lib/license/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 설정이 빠진 것을 한눈에 보게 한다 (값은 내보내지 않고 있고 없음만). */
export async function GET() {
  return handle(async () => {
    let store = "none";
    let storeError: string | null = null;
    try {
      store = getStore().kind;
    } catch (e) {
      storeError = (e as Error).message;
    }
    return {
      ok: true,
      store,
      storeError,
      signingKey: !!(process.env.LICENSE_PRIVATE_KEY || "").trim(),
      adminToken: !!(process.env.LICENSE_ADMIN_TOKEN || "").trim(),
    };
  });
}
