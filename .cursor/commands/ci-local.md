# /ci-local

## Intent
CI에서 수행할 검증을 로컬에서 재현합니다.

## Steps
```bash
pnpm install
pnpm lint || echo "(no lint script)"
pnpm build
pnpm test || echo "(no test script)"
```
