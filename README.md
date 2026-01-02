# redpen

**The senior engineer review system in a box.**

Production-grade prompts for auditing AI-assisted codebases.

### Installation

```bash
# npm (recommended)
npm install -g redpen

# or run directly
npx redpen order
```

### Usage

Run checks in canonical order:
```bash
redpen next
redpen copy auth-data-safety
# Paste into Claude/Cursor -> Fix issues -> Mark done
redpen done auth-data-safety
```

Or pick specific audits:
```bash
redpen show nextjs-rendering
redpen copy ui/mobile-responsive-layout-audit
```

### Principles

redpen is built to catch what vibecoding misses.

- **System Safety First** — Audit RLS, auth boundaries, and data invariants before UI polish.
- **Enforcement** — Prompts are strict. They don't teach; they verify.
- **One Voice** — Consistent senior-level judgment across every PR.
- **Anti-Hallucination** — Forces agents to verify code exists before passing.

### Capabilities

The library contains 29 specialized audits:

- **Safety**: `auth-data-safety`, `invariant`, `data-consistency`, `human-error`
- **Framework**: `nextjs-rendering`, `optimization`, `operability`
- **Mobile**: `mobile-responsive`, `thumb-reach`, `touch-targets`
- **UI**: `design-tokens`, `a11y`, `error-boundaries`
- **Content**: `voice-guide`, `content-density`

### FAQ

#### How is this different from strict mode?
Strict mode in prompts often just changes the tone. redpen prompts are strict *checklists* of specific failure modes (e.g., "Check if `revalidatePath` is used correctly in server actions").

#### Does it work with Cursor/Copilot?
Yes. It is designed for it. The typical workflow is:
1. Code feature with Cursor.
2. Run `redpen copy <audit-type>`.
3. Paste into Cursor Chat: "Audit my last changes using this rule set."

#### Is this a replacement for tests?
No. It helps you *write* the right tests (`test-generation-prompt`) and catches architecture bugs that unit tests miss.
