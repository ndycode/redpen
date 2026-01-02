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

### Scope

redpen is a complete review lifecycle. It doesn't just check code; it enforced a strict 9-phase quality gate.

#### 1. System Safety
Force-check your database and auth boundaries before any UI work.
- `auth-data-safety` — RLS policies, exposure risk
- `data-consistency` — Transactions, idempotency
- `invariant` — Business logic state machines
- `human-error` — API usability and footguns

#### 2. Framework & Ops
Validate your Next.js architecture.
- `nextjs-rendering` — Caching, hydration, boundaries
- `operability` — Logger structure, tracing
- `optimization` — Bundle size, render cycles

#### 3. Testing
Stop writing tests that always pass.
- `test-generation` — Finds missing edge cases

#### 4. UI System
Enforce design discipline.
- `ui/design-tokens-enforcement` — No magic values
- `ui/ui-components-audit` — duplication detection
- `ui/ui-consistency-audit` — Visual regression checks
- `ui/ui-performance` — Render counting

#### 5. Mobile
The "Thumb Reach" standard.
- `ui/mobile/mobile-responsive-layout-audit`
- `ui/mobile/mobile-navigation-and-thumb-reach`
- `ui/mobile/mobile-a11y-touch-audit`
- `ui/mobile/mobile-forms-inputs`

#### 6. Content & Polish
- `content/product-copy-voice-guide`
- `marketing/content-density`

### Principles

- **Safety First** — Never audit UI on a broken backend.
- **Enforcement** — Prompts are strict. They verify; they don't teach.
- **One Voice** — Consistent senior-level judgment across every PR.

### FAQ

#### How is this different from strict mode?
Strict mode just changes the tone. redpen prompts are strict *checklists* of specific failure modes (e.g., checking `revalidatePath` mechanics, not just style).

#### Does it work with Cursor?
Yes. It is designed for it.
1. Build with Cursor.
2. `redpen copy <audit>`.
3. Paste into Cursor Chat: "Audit my last changes."

#### Is this a replacement for tests?
No. It helps you *write* the right tests and catches architecture bugs that unit tests miss.
