# redpen

Production-grade audit prompts for AI-assisted codebases.

## Install

```bash
npm install -g redpen
```

## Setup

```bash
redpen init
```

Select platform (web or mobile). Auto-detects Flutter (pubspec.yaml) and React Native.

## Commands

```bash
redpen init         # configure stack
redpen run          # copy → wait → mark done

redpen next         # what to run
redpen order [tag]  # full sequence (filter: order security)
redpen status       # progress
redpen list         # all prompts

redpen copy [n]     # copy prompt
redpen show [n]     # print prompt
redpen done [n]     # mark complete
redpen skip [n]     # skip prompt
redpen undo         # undo last done

redpen check [cats] # CI: fail if incomplete
redpen report       # markdown audit summary
redpen doctor       # validate config
redpen completion   # shell completion script
redpen reset        # clear progress
```

## Features

### Numeric Shortcuts
```bash
redpen copy 3       # copy prompt #3
```

### Tag Filtering
```bash
redpen order security    # show only security prompts
redpen check security    # CI check only security
```

### Custom Prompts
Add project-specific prompts to `.redpen/` folder in your project root.

### Branch Progress
Progress tracked separately per git branch: `.redpen-progress-{branch}.json`

### Color Output
- 🟢 Green = completed
- 🟡 Yellow = next up
- ⚪ Dim = pending

### Shell Completion
```bash
eval "$(redpen completion)"
```

### CI Integration
```yaml
- run: npx redpen check security,quality
```

## Prompts

### Core (always included)
- `core/security/*` — authorization, data integrity
- `core/quality/*` — test coverage
- `core/architecture/*` — observability
- `core/process/*` — documentation

### Web Platform
- `web/frontend/*` — Next.js, React, Vue
- `web/interface/*` — design system, accessibility

### Mobile Platform
- `mobile/*` — Flutter/mobile-specific

## Philosophy

**Verification over Generation.** AI optimizes for plausibility. redpen enforces correctness.
