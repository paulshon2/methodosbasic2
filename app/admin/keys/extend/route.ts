import { handle, readJson, requireAdmin } from "@/lib/license/http";
import { adminExtend } from "@/lib/license/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    return adminExtend(await readJson(req));
  });
}
