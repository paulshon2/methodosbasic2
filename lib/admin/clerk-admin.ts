import { auth, currentUser } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { isAllowedAdmin, parseList } from "./allow";

export type ClerkAdmin = { userId: string; email: string };
export type AdminCheck =
  | { state: "not_configured" } // Clerk 키 없음
  | { state: "no_admin_list" } // ADMIN_EMAILS / ADMIN_PHONES / ADMIN_CLERK_USER_IDS 없음
  | { state: "signed_out" }
  | { state: "forbidden"; email: string }
  | { state: "ok"; admin: ClerkAdmin };

/** 현재 요청의 Clerk 세션이 관리자인지 따진다. */
export async function checkClerkAdmin(): Promise<AdminCheck> {
  if (!clerkConfigured()) return { state: "not_configured" };
  const allowIds = parseList(process.env.ADMIN_CLERK_USER_IDS);
  const allowEmails = parseList(process.env.ADMIN_EMAILS);
  const allowPhones = parseList(process.env.ADMIN_PHONES);
  if (!allowIds.length && !allowEmails.length && !allowPhones.length) return { state: "no_admin_list" };

  const { userId } = await auth();
  if (!userId) return { state: "signed_out" };

  const user = await currentUser();
  const primary = user?.primaryEmailAddress;
  const email = primary?.emailAddress ?? "";
  const phone = user?.primaryPhoneNumber;
  const ok = isAllowedAdmin({
    userId,
    email,
    emailVerified: primary?.verification?.status === "verified",
    phone: phone?.phoneNumber ?? "",
    phoneVerified: phone?.verification?.status === "verified",
    allowIds,
    allowEmails,
    allowPhones,
  });
  const label = email || phone?.phoneNumber || userId;
  return ok ? { state: "ok", admin: { userId, email: label } } : { state: "forbidden", email: label };
}
