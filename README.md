# redpen

Audit prompts for AI-generated code. Run them before you ship.

## Install

```bash
npm install -g redpen
```

## Usage

```bash
redpen              # opens the TUI
redpen init         # first-time setup
```

The TUI lets you step through prompts one by one. Arrow keys to navigate, `r` to copy, `d` to mark done, `q` to quit.

## Commands

```bash
redpen next         # show next prompt
redpen copy [n]     # copy prompt n to clipboard
redpen done [n]     # mark prompt n complete
redpen skip [n]     # skip prompt n
redpen undo         # undo last done
redpen status       # show progress
redpen list         # list all prompts
redpen order [tag]  # show run order (optionally filter by tag)
redpen reset        # clear all progress
redpen check [cats] # CI mode - exit 1 if prompts incomplete
redpen report       # generate markdown summary
```

## What it does

You get a set of prompts organized by category. Each prompt tells an AI what to look for in your code. You copy the prompt, paste it into your AI, review the output, then mark it done.

Progress is saved per git branch.

## Prompts

Core prompts run on every project:
- `core/security/*` - auth, data safety
- `core/quality/*` - tests
- `core/architecture/*` - observability
- `core/process/*` - docs

Stack-specific prompts load based on your config:
- `web/frontend/{nextjs,react,vue}/*`
- `web/backend/{supabase,firebase,prisma}/*`
- `web/interface/*` - design system, a11y
- `mobile/{flutter,react-native,native}/*`

## Custom prompts

Drop `.txt` files in `.redpen/` in your project root. They get added to the run order.

## CI

```yaml
- run: npx redpen check security,quality
```

Fails the build if those categories have incomplete prompts.

## Shell completion

```bash
eval "$(redpen completion)"
```

## Why

AI writes plausible code. That does not mean correct code. These prompts force a second pass focused on the stuff AI tends to miss: edge cases, security holes, missing tests, production concerns.

Run them. Fix what they find. Ship with confidence.
