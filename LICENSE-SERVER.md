# MethodosBasic-LT_V4-Le1

Research statistical analysis — **Methodos Basic** 공식 다운로드·소개 사이트 (Next.js).

Clerk · Vercel · Supabase. 데스크톱 배포: **Methodos Basic LT** (Windows 포터블 · macOS dmg x64/arm64).

## 로컬 실행

```bash
cp .env.example .env.local
npm install
npm run dev
```

브라우저: http://localhost:3000

## 검증

```bash
npm run verify
```

## Vercel 배포

1. 이 저장소를 Vercel에 Import (Framework: Next.js, Root: 저장소 루트)
2. Environment Variables: `.env.example` 참고
3. macOS ZIP 등은 Supabase Storage `releases` 버킷 또는 `NEXT_PUBLIC_DOWNLOAD_*_URL` 설정

## Windows / macOS 다운로드

`/api/download/*` → 302 리다이렉트.  
Windows(포터블 `win-portable` · 설치형 `win-setup`): 기본값은 **GitHub Release**
(`lib/download-url.ts` 의 `RELEASE_TAG`, 현재 `v22.19.0-authv1`). Mac: `mac-x64-dmg`, `mac-arm64-dmg`(Google Drive).  
Vercel에서 `NEXT_PUBLIC_DOWNLOAD_*_URL` 로 다른 URL 지정 가능(있으면 우선).

## 인증키(라이선스) 서버

데스크톱 앱(AuthV1)이 이 사이트를 라이선스 서버로 쓴다 — 별도 서버 PC가 필요 없고 HTTPS도 Vercel이 맡는다.

| 주소 | 용도 |
|---|---|
| `POST /api/activate` · `/api/renew` · `/api/deactivate` | 온라인 활성화 · 임대 갱신 · 기기 등록 해제 |
| `POST /api/offline-activate` · 페이지 `/offline` | 인터넷 없는 PC용 요청 코드 → 응답 코드 |
| `GET /api/license-health` | 설정 점검(저장소·서명 키·관리자 토큰의 있고 없음만) |
| `GET·POST /admin/keys`, `/admin/keys/{revoke,extend,release}` | 발급·연장·해지 (헤더 `x-admin-token`) |

**처음 설정 (한 번)**
1. Supabase SQL editor 에서 `supabase/license_keys.sql` 실행.
2. Vercel 환경변수: `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`(비밀) ·
   `LICENSE_PRIVATE_KEY`(서명 개인키 PEM, 앱에 구운 공개키와 한 쌍) · `LICENSE_ADMIN_TOKEN`(길고 무작위로).
3. 재배포 후 `https://methodosbasic2.vercel.app/api/license-health` 가 `store: "supabase"`, `signingKey: true`, `adminToken: true` 인지 본다.

**키 발급** (앱 배포 폴더의 `license-server/tools/admin.cjs`)
```bash
LICENSE_SERVER=https://methodosbasic2.vercel.app ADMIN_TOKEN=...   node tools/admin.cjs create --to "고객사" --months 12     # 1~12개월, --years 1|2|3
```

개인키는 저장소에 올리지 않는다(`.env.local`·Vercel 환경변수에만). 개인키를 바꾸면 이미 배포한 앱의 라이선스는 전부
무효가 되므로 새 공개키로 앱을 다시 빌드해야 한다.

## 주의

- `.env.local`은 Git에 올리지 마세요.
- `node_modules`, `.next`는 `.gitignore` 처리됨.

## 관리 웹페이지 (`/admin`) — Clerk 로그인으로 키 발급·연장·해지

`https://methodosbasic2.vercel.app/admin` — CLI 없이 브라우저에서 인증키를 관리한다.

- **발급**: 받는 사람·메모, **기간(1~11개월, 1년, 2년, 3년)**, 허용 PC 수를 고르고 "인증키 발급". 기간은 구매자가 처음 활성화한 날부터 센다.
- **목록**: 키·대상·기간·만료일·상태·사용 PC. 검색, 키 복사, **+1개월/+3개월/+1년 연장**, **해지**, PC 등록 **해제**(PC 교체 때). 해지된 키는 연장하면 복구된다.
- **인증**: Clerk 로그인 + **허용 목록**. 목록에 없는 계정(가입은 누구나 가능)은 "접근 권한이 없습니다".
  - `ADMIN_EMAILS` — 관리자 이메일(쉼표 구분). Clerk 에서 **인증이 끝난 이메일**만 인정.
  - `ADMIN_PHONES` — 관리자 휴대폰(쉼표 구분). `010-1234-5678` 과 `+82 10 1234 5678` 은 같은 번호. **인증이 끝난 번호**만 인정.
  - `ADMIN_CLERK_USER_IDS` — (선택) Clerk 사용자 ID 로 직접 지정.
  - 세 목록이 모두 비어 있으면 **아무도 들어올 수 없다**(설정 누락 = 닫힘).
- 같은 사이트 화면에서 온 요청만 세션 인증을 받는다(`x-admin-ui` 헤더). CLI 용 `x-admin-token` 경로(`LICENSE_ADMIN_TOKEN`)는 그대로 있다.
- `/admin-preview` 는 개발 미리보기(토큰 입력)이며 **운영에서는 404** 다.

### Clerk 에서 휴대폰 로그인을 켜려면
Clerk Dashboard → **User & authentication** → **Phone number** 를 켠다(가입·로그인 식별자, 인증 방법 SMS 코드).
SMS 발송 가능 국가에 대한민국이 포함되는지는 대시보드의 SMS 설정에서 확인한다. 이메일만 쓸 거면 건너뛰어도 된다.
