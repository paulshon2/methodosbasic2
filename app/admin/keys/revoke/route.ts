import { handle, readJson, requireAdmin } from "@/lib/license/http";
import { adminRevoke } from "@/lib/license/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    return adminRevoke(await readJson(req));
  });
}
