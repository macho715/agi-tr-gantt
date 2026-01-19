# Agent Skills 설치 안내 (Claude / Cursor / Codex / VS Code)

## 1) 이 패키지 포함물
- `AGENTS.md`: 프로젝트 공통 규칙
- `skills/`: 스킬 원본(표준 폴더)
- `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`, `.github/skills/`: 플랫폼별 미러(복사 후 즉시 사용)

## 2) 설치(프로젝트 레포 기준)
### A) Claude Code
- 레포 루트: `.claude/skills/<skill-name>/SKILL.md`

### B) Cursor
- 레포 루트: `.cursor/skills/<skill-name>/SKILL.md`

### C) OpenAI Codex
- 레포 루트: `.codex/skills/<skill-name>/SKILL.md`
- 사용자 전역: `~/.codex/skills/<skill-name>/SKILL.md`

### D) VS Code Copilot Agent
- 레포 루트: `.github/skills/<skill-name>/SKILL.md`

## 3) 빠른 테스트(로컬)
### docsDef 추출 + due 계산
```bash
python skills/voyage-docs-duecalc/scripts/extract_docsdef.py \
  --in skills/voyage-docs-duecalc/examples/checklist.example.txt \
  --out /tmp/docsDef.json --default-lead-days 4 --default-trigger loadout --business-days

python skills/voyage-docs-duecalc/scripts/calc_due_dates.py \
  --voyage skills/voyage-docs-duecalc/examples/voyage.example.json \
  --docs /tmp/docsDef.json \
  --now 2026-01-19T12:00:00+04:00 \
  --out /tmp/docsComputed.json

cat /tmp/docsComputed.json
```

## 4) 공식 문서(참조)
```text
OpenAI Codex Agent Skills: https://developers.openai.com/codex/skills/
Claude Code Skills: https://code.claude.com/docs/en/skills
Cursor Agent Skills: https://cursor.com/docs/context/skills
VS Code Copilot Agent Skills: https://code.visualstudio.com/docs/copilot/customization/agent-skills
```
