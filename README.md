# redpen

<p align="center">
  <img src="https://img.shields.io/npm/v/redpen.svg?style=flat-square&color=e34671" alt="npm version">
  <img src="https://img.shields.io/npm/dm/redpen.svg?style=flat-square" alt="downloads">
</p>

A senior engineer review system in a box. Production-grade prompts for auditing AI-assisted codebases.

**v2.0.0 is here!** Now featuring **team orchestration**, a massive library of 116+ prompts, and a fully interactive **TUI** with category sidebars.

## Installation

```bash
npm install -g redpen
```

## Features
- **Team Orchestration**: Coordinate parallel AI agents (`redpen team start`).
- **Interactive TUI**: New category sidebar, fuzzy search (`/`), progress tracking.
- **70+ New Prompts**: Deep insights for Security, Architecture, DevOps, and Frontend.
- **First-Run Wizard**: `redpen setup` auto-detects your stack (Next.js, Vue, Supabase, Flutter, etc.).
- **Diagnostic Tooling**: Check system health with `redpen doctor`.
- **Extensible Hooks**: Build plugins to listen to lifecycle events.

## Commands

| Command | Description |
|---------|-------------|
| `redpen` | Interactive TUI |
| `redpen setup` | First-time interactive setup wizard |
| `redpen team start [name]` | Start a coordinated team session |
| `redpen doctor` | Validate system and config health |
| `redpen agents list` | List available agent profiles |
| `redpen skills list` | List available skills |
| `redpen check [cats]` | CI mode - exit 1 if incomplete |
| `redpen report` | Markdown summary |

## Configuration
Run `redpen setup` or just run `redpen` to launch the interactive config wizard.

Config and progress are stored safely in:
- **Linux**: `~/.config/redpen/projects/<hash>/`
- **macOS**: `~/Library/Application Support/redpen/projects/<hash>/`
- **Windows**: `%APPDATA%\redpen\projects\<hash>\`

## License
MIT
