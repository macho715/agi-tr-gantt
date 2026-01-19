# Cursor Setup for `agi-tr-gantt`

이 폴더는 **Cursor 프로젝트 설정(규칙/커맨드/워크스페이스/CI 템플릿)**을 포함합니다.

## 설치

1) 레포 루트(= `package.json`이 있는 위치)에 압축을 풀어 `.cursor/`가 생기도록 합니다.

2) Cursor를 재시작(또는 Reload Window)하면 Rules/Commands가 로드됩니다.

## 포함 내용

- `.cursor/rules/*.mdc`: 프로젝트 규칙
- `.cursor/commands/*.md`: 슬래시 커맨드
- `.cursor/config/workspace.json`: 시작 시 열 문서/터미널 단축
- `.cursor/hooks/preload_docs.yaml`: 문서 자동 로드
- `.github/workflows/ci.yml`: pnpm 기반 CI 템플릿(옵션)

## 빠른 확인

```bash
pnpm install
pnpm dev
```
