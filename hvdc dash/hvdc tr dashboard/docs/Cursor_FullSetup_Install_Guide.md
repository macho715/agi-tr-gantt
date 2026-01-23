# Cursor 풀세팅 패치 — HVDC TR Transport Dashboard (Next.js)

## 1) 설치(레포 루트에서)

```bash
# 1) 압축 해제
unzip cursor_full_setup_hvdc_tr_dashboard_v1.zip -d .

# 2) Cursor 재시작(또는 Reload Window)
# Docs/RULES/COMMANDS가 자동 인식됩니다.
```

## 2) 환경 진단(추측 금지)

```bash
node tools/detect_pm_and_scripts.mjs
```

- lockfile로 패키지 매니저를 확정하고,
- `package.json` scripts를 읽어 **존재하는 커맨드만** 출력합니다.

## 3) 검증 실행(존재하는 스크립트만 실행)

```bash
node tools/run_validate.mjs
```

## 4) CI 동작

- GitHub Actions는 lockfile 기반으로 install을 수행하고,
- `lint/typecheck/test/build`는 **스크립트가 존재할 때만** 실행합니다(추측 금지).

## 5) 필수 보존 규칙

- `app/globals.css` (Deep Ocean Theme) 변경 금지
- `app/layout.tsx`, `app/page.tsx` 조립 패턴 유지
