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

### Platform Selection
- **Web**: frontend (nextjs/react/vue) + backend (supabase/firebase/prisma)
- **Mobile**: framework (flutter/react-native/native)

Auto-detects Flutter (pubspec.yaml) and React Native.

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
```

### Custom Prompts
Add project-specific prompts to `.redpen/` folder.

### Branch Progress
Progress tracked per git branch.

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
- `web/frontend/{nextjs,react,vue}/*`
- `web/interface/*` — design system, accessibility
- `web/backend/{supabase,firebase,prisma}/*`

### Mobile Platform
- `mobile/core/*` — shared mobile prompts (always loaded)
- `mobile/flutter/*` — Flutter-specific
- `mobile/react-native/*` — React Native-specific
- `mobile/native/*` — iOS/Android native

## Philosophy

**Verification over Generation.** AI optimizes for plausibility. redpen enforces correctness.
