import { handle, readJson, requireAdmin } from "@/lib/license/http";
import { adminCreate, adminList } from "@/lib/license/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    return { keys: await adminList() };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    return adminCreate(await readJson(req));
  });
}
