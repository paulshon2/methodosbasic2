/** Clerk 로그인 사용자가 "관리자"인지 판정하는 순수 함수 (외부 의존 없음 — 시험하기 쉽게 따로 뒀다). */

export function parseList(value: string | undefined): string[] {
  return (value || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 휴대폰 번호를 비교용으로 맞춘다: 숫자만 남기고, 국가번호 82 는 국내 0 으로 바꾼다.
 *   "+82 10-1234-5678" → "01012345678",  "010-1234-5678" → "01012345678"
 * 너무 짧으면(자릿수 부족) 빈 문자열 — 빈 값은 절대 일치하지 않는다.
 */
export function normalizePhone(value: string | null | undefined): string {
  let d = String(value || "").replace(/\D/g, "");
  if (d.startsWith("82") && d.length >= 11) d = "0" + d.slice(2);
  return d.length >= 9 ? d : "";
}

export function isAllowedAdmin(opts: {
  userId: string;
  email?: string | null;
  emailVerified: boolean;
  phone?: string | null;
  phoneVerified?: boolean;
  allowIds: string[];
  allowEmails: string[];
  allowPhones?: string[];
}): boolean {
  // 허용 목록이 모두 비어 있으면 아무도 관리자가 아니다 (설정 누락 = 닫힘).
  if (opts.allowIds.includes(opts.userId)) return true;

  const email = (opts.email || "").trim().toLowerCase();
  // 인증이 안 된 이메일·번호로 가입한 사람은 목록에 있는 값을 써서 관리자가 될 수 없다.
  if (email && opts.emailVerified && opts.allowEmails.some((e) => e.trim().toLowerCase() === email)) return true;

  const phone = normalizePhone(opts.phone);
  const allowPhones = (opts.allowPhones || []).map(normalizePhone).filter(Boolean);
  if (phone && opts.phoneVerified && allowPhones.includes(phone)) return true;

  return false;
}
