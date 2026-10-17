// 관리자 판정 시험 —  node --experimental-strip-types scripts/test-admin-allow.mjs
import { isAllowedAdmin, normalizePhone, parseList } from "../lib/admin/allow.ts";

let pass = 0, fail = 0;
const check = (name, cond) => (cond ? (pass++, console.log("PASS", name)) : (fail++, console.log("FAIL", name)));
const base = { userId: "user_1", email: "a@x.com", emailVerified: true, phone: "", phoneVerified: false, allowIds: [], allowEmails: [], allowPhones: [] };

check("empty allow lists -> nobody", !isAllowedAdmin(base));
check("allowed email (verified) -> admin", isAllowedAdmin({ ...base, allowEmails: ["A@X.com"] }));
check("allowed email but UNverified -> denied", !isAllowedAdmin({ ...base, emailVerified: false, allowEmails: ["a@x.com"] }));
check("other email -> denied", !isAllowedAdmin({ ...base, allowEmails: ["b@x.com"] }));
check("allowed user id -> admin", isAllowedAdmin({ ...base, allowIds: ["user_1"] }));
check("phone 010 form matches +82 form", isAllowedAdmin({ ...base, email: "", phone: "+82 10-1234-5678", phoneVerified: true, allowPhones: ["010-1234-5678"] }));
check("phone +82 allow matches 010 user", isAllowedAdmin({ ...base, email: "", phone: "010 1234 5678", phoneVerified: true, allowPhones: ["+821012345678"] }));
check("allowed phone but UNverified -> denied", !isAllowedAdmin({ ...base, email: "", phone: "01012345678", phoneVerified: false, allowPhones: ["01012345678"] }));
check("different phone -> denied", !isAllowedAdmin({ ...base, email: "", phone: "01099998888", phoneVerified: true, allowPhones: ["01012345678"] }));
check("empty/short phone never matches", !isAllowedAdmin({ ...base, email: "", phone: "", phoneVerified: true, allowPhones: [""] }));
check("normalizePhone variants", normalizePhone("+82-10-1234-5678") === "01012345678" && normalizePhone("0101234") === "");
check("parseList splits , ; space", parseList("a@x.com, b@x.com;010-1111-2222").length === 3);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
