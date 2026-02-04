<p align="center"><img src="https://img.shields.io/npm/v/redpen.svg?style=flat-square&color=e34671" alt="npm version"> <img src="https://img.shields.io/npm/dm/redpen.svg?style=flat-square" alt="downloads"> <img src="https://img.shields.io/github/stars/ndycode/redpen.svg?style=flat-square" alt="stars"> <img src="https://img.shields.io/github/license/ndycode/redpen.svg?style=flat-square" alt="license"></p>

# redpen

<p align="center"><img src="assets/tui.png" width="700"></p>

Code review checklist for AI-generated code. Step through prompts, paste into your AI, fix issues, mark done.

## Overview

redpen is a CLI tool that guides you through a set of code review prompts. Each prompt tells an AI what to look for in your codebase. You copy the prompt, paste it into ChatGPT/Claude/Cursor, fix what it finds, then mark it done. Progress saves per git branch.

## Features

- **Interactive TUI**: Arrow keys to navigate, single-key actions
- **First-Run Setup**: Auto-detects your stack, guided init wizard
- **Fuzzy Search**: Press `/` to quickly find prompts
- **Progress Tracking**: Saves per git branch in user directory (keeps project clean)
- **Stack-Aware**: Loads prompts for your specific stack (Next.js, Supabase, Flutter, etc.)
- **Custom Prompts**: Add your own prompts in `.redpen/` folder
- **CI Integration**: Fail builds if prompts incomplete

## Installation

```bash
npm install -g redpen
```

## Usage

```bash
# Start the TUI (runs init wizard on first use)
redpen

# Or explicitly run setup
redpen init
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `r` / `Enter` | **Run**: copy + mark done + advance |
| `c` | Copy only (no mark done) |
| `s` | Skip prompt + advance |
| `n` | Jump to next incomplete |
| `d` | Toggle done / undo |
| `/` | Search prompts (fuzzy) |
| `?` | Help overlay |
| `←` `→` `h` `l` | Previous / next prompt |
| `↑` `↓` `k` `j` | Previous / next prompt |
| `Home` `End` | First / last prompt |
| `q` / `Esc` | Quit |

### Search Mode (`/`)

- Type to fuzzy filter prompts
- `↑` `↓` to navigate results  
- `Enter` to select
- `Esc` to cancel

## How It Works

1. Run `redpen` - TUI opens at first incomplete prompt
2. Press `r` - copies prompt, marks done, advances to next
3. Paste into your AI - it reviews your code
4. Fix what it finds
5. Repeat until complete

**One key does it all** - no more `r` then `d` then arrow key.

## Commands

| Command | Description |
|---------|-------------|
| `redpen` | Interactive TUI (recommended) |
| `redpen init` | First-time setup |
| `redpen next` | Show next prompt |
| `redpen copy [n]` | Copy prompt n |
| `redpen done [n]` | Mark prompt n complete |
| `redpen skip [n]` | Skip prompt n |
| `redpen undo` | Undo last done |
| `redpen status` | Show progress |
| `redpen list` | List all prompts |
| `redpen order [tag]` | Show run order |
| `redpen reset` | Clear progress |
| `redpen check [cats]` | CI mode - exit 1 if incomplete |
| `redpen report` | Markdown summary |
| `redpen verify` | Validate prompt standard |

## Prompts

### Core (always loaded)

| Category | What it checks |
|----------|----------------|
| `core/security/*` | Auth, data safety, access control |
| `core/quality/*` | Test coverage, error handling |
| `core/architecture/*` | Logging, monitoring, observability |
| `core/process/*` | Documentation, code standards |

### Stack-Specific (based on config)

| Stack | Prompts |
|-------|---------|
| Next.js | `web/frontend/nextjs/*` |
| React | `web/frontend/react/*` |
| Vue | `web/frontend/vue/*` |
| Supabase | `web/backend/supabase/*` |
| Firebase | `web/backend/firebase/*` |
| Prisma | `web/backend/prisma/*` |
| Flutter | `mobile/flutter/*` |
| React Native | `mobile/react-native/*` |
| Native iOS/Android | `mobile/native/*` |

## Custom Prompts

Add `.txt` files to `.redpen/` in your project root:

```
your-project/
  .redpen/
    my-custom-check.txt
    team/coding-standards.txt
```

They get added to the run order automatically.

## CI Integration

```yaml
# GitHub Actions
- run: npx redpen check security,quality
```

Exits with code 1 if security or quality prompts are incomplete.

## Configuration

Run `redpen init` or just run `redpen` - the TUI will guide you through setup on first use.

Config and progress are stored in your user directory (not in the project):

| Platform | Location |
|----------|----------|
| **Linux** | `~/.config/redpen/projects/<hash>/` |
| **macOS** | `~/Library/Application Support/redpen/projects/<hash>/` |
| **Windows** | `%APPDATA%\redpen\projects\<hash>\` |

Each project gets its own folder (identified by git remote URL hash). Inside:

```
config.json           # Your stack settings
progress-main.json    # Progress for 'main' branch
progress-feature.json # Progress for 'feature' branch
```

Example `config.json`:

```json
{
  "platform": "web",
  "frontend": "nextjs",
  "backend": "supabase"
}
```

For mobile:

```json
{
  "platform": "mobile",
  "framework": "flutter"
}
```

Run `redpen doctor` to see where your config is stored.

## Auto-Detection

redpen automatically detects your stack from:

| File | Detection |
|------|-----------|
| `pubspec.yaml` | Flutter |
| `react-native` in package.json | React Native |
| `next` in package.json | Next.js |
| `@supabase/supabase-js` | Supabase |
| `firebase` | Firebase |
| `@prisma/client` | Prisma |

Detected values are pre-selected in the init wizard.

## Shell Completion

```bash
# Add to your shell profile
eval "$(redpen completion)"
```

## Development

Release (maintainers):

```bash
# Generate notes from template
node scripts/release.mjs <version>

# Or provide explicit notes
node scripts/release.mjs <version> --notes path/to/notes.md
```

## Why This Exists

AI writes code that compiles and looks correct. But it misses things: security holes, missing error handling, edge cases, no tests, production gotchas.

These prompts catch what AI misses. Run them before you ship.

## License

MIT
