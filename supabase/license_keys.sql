-- 인증키 저장소 (Supabase SQL editor 에서 한 번 실행)
-- 서비스 롤 키(SUPABASE_SERVICE_ROLE_KEY)로만 읽고 쓴다. RLS 를 켜고 정책을 두지 않으면
-- anon/authenticated 는 아무것도 못 하고, 서비스 롤은 RLS 를 건너뛴다.
create table if not exists public.license_keys (
  key        text primary key,
  data       jsonb   not null,
  version    integer not null default 1,   -- 동시 수정 감지(낙관적 잠금)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.license_keys enable row level security;
