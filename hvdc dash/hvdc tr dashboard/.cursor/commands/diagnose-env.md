# /diagnose env
레포의 lockfile + package.json scripts를 읽어서 **확정된 커맨드**를 JSON으로 출력한다.

## Run
```bash
node tools/detect_pm_and_scripts.mjs
```

## Output
- packageManager: pnpm|yarn|npm
- scripts: {key: cmd}
- confirmedCommands: 존재하는 항목만
