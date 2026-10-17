import { handle, rateLimit, readJson } from "@/lib/license/http";
import { activate } from "@/lib/license/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    rateLimit(req);
    const body = await readJson(req);
    return { license: await activate(body, "online") };
  });
}
