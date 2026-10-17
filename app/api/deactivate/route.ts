import { handle, rateLimit, readJson } from "@/lib/license/http";
import { deactivate } from "@/lib/license/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    rateLimit(req);
    const body = await readJson(req);
    return (await deactivate(body), { ok: true });
  });
}
