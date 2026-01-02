# redpen

> A senior engineer review system in a box. Production-grade prompts for auditing AI-assisted codebases.

[![npm version](https://badge.fury.io/js/redpen.svg)](https://www.npmjs.com/package/redpen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is redpen?

**redpen** is a structured prompt library designed to catch what vibecoding misses.

When you build fast with AI (Cursor, Copilot, Claude), you're optimizing for speed. redpen is the review layer that catches auth gaps, data corruption risks, caching bugs, and UX failures before they hit production.

It's how Stripe, Notion, and Vercel-tier teams review code — packaged as prompts you can run with any AI.

---

## Why redpen?

| Without redpen | With redpen |
|-----------------|--------------|
| "It works on my machine" | Verified safe to ship |
| Silent data leaks | RLS + auth audited |
| Caching bugs in prod | Rendering behavior verified |
| UI inconsistencies | Design system enforced |
| Mobile breaks after launch | Mobile-first validated |
| "We'll fix it later" | Fixed before shipping |

---

## Installation

### npm (recommended)

```bash
npm install -g redpen
```

### Manual

```bash
git clone https://github.com/ndycode/redpen.git
cd redpen
```

---

## Quick Start

### 1. Run a single prompt

```bash
# Copy prompt content, paste into your AI (Claude, ChatGPT, Cursor)
redpen show auth-data-safety

# Or output to clipboard
redpen copy auth-data-safety
```

### 2. Run the full review sequence

```bash
# See the canonical order
redpen order

# Get next prompt in sequence
redpen next

# Mark prompt complete
redpen done auth-data-safety
```

### 3. Check progress

```bash
redpen status
```

---

## Prompt Library

### Phase 1: System Safety
| Prompt | Purpose | Frequency |
|--------|---------|-----------|
| `analysis` | Forensic codebase audit | Per-release |
| `auth-data-safety` | RLS and auth boundaries | Per-release |
| `data-consistency` | Transactions and constraints | Per-release |
| `invariant` | Business rule enforcement | Per-release |
| `blast-radius` | Change coupling analysis | Periodic |
| `human-error` | Foot-gun prevention | Periodic |

### Phase 2: Framework & Rendering
| Prompt | Purpose | Frequency |
|--------|---------|-----------|
| `nextjs-rendering` | Caching and isolation | Per-release |
| `operability` | Logging and observability | Per-release |
| `optimization` | Performance velocity | Periodic |

### Phase 3: Test Strategy
| Prompt | Purpose | Frequency |
|--------|---------|-----------|
| `test-generation` | Test coverage gaps | Per-release |

### Phase 4: UI System
| Prompt | Purpose | Frequency |
|--------|---------|-----------|
| `ui/design-tokens-enforcement` | Token enforcement | Per-PR |
| `ui/ui-components-audit` | Component reuse | Per-PR |
| `ui/ui-consistency-audit` | Cross-page consistency | Per-PR |
| `ui/ui-accessibility` | Keyboard and screen reader | Per-PR |
| `ui/ui-performance` | Render efficiency | Per-release |

### Phase 5: Content & Copy
| Prompt | Purpose | Frequency |
|--------|---------|-----------|
| `content/product-copy-voice-guide` | Voice consistency | Per-PR |
| `marketing/content-density` | Information density | Per-PR |

### Phase 6: Mobile
| Prompt | Purpose | Frequency |
|--------|---------|-----------|
| `ui/mobile/mobile-responsive-layout-audit` | Layout on small screens | Per-PR |
| `ui/mobile/mobile-navigation-and-thumb-reach` | One-handed usability | Per-PR |
| `ui/mobile/mobile-a11y-touch-audit` | Touch accessibility | Per-PR |
| `ui/mobile/mobile-forms-inputs` | Mobile form UX | Per-PR |
| `ui/mobile/mobile-performance-and-hydration` | Mobile bundle size | Per-release |
| `ui/mobile/mobile-visual-density` | Readability | Per-PR |

### Phase 7: Failure States
| Prompt | Purpose | Frequency |
|--------|---------|-----------|
| `ui/error-boundary-and-fallback-ux` | Error recovery UX | Per-release |

### Phase 8: Marketing (Optional)
| Prompt | Purpose | Frequency |
|--------|---------|-----------|
| `marketing/nextjs-marketing-page-de-templatization` | Remove generic patterns | One-time |

### Phase 9: Hygiene
| Prompt | Purpose | Frequency |
|--------|---------|-----------|
| `docs/docs-sync-and-accuracy` | Documentation accuracy | Periodic |
| `engineering/dx-workflow-and-pr-review` | DX and PR quality | Periodic |

---

## Canonical Run Order

```
System Safety → Framework → Tests → UI → Content → Mobile → Failure → Marketing → Hygiene
```

**Why this order?**
- System safety before everything (no UI polish on broken systems)
- Content before mobile (copy defines layout pressure)
- Failure states after mobile (must validate on all layouts)
- Marketing is optional, hygiene is last

---

## Usage with AI Tools

### Claude / ChatGPT

1. Run `redpen copy <prompt-name>`
2. Paste into chat
3. Follow the prompt's output format
4. Address CRITICAL and HIGH findings before shipping

### Cursor

1. Open `.cursorrules` or chat
2. Paste prompt content
3. Ask Cursor to audit your codebase

### Codebase Context

For best results, provide:
- Your tech stack (Next.js, Supabase, etc.)
- Relevant file paths
- Recent changes being reviewed

---

## Configuration

Create `.redpenrc` in your project root:

```json
{
  "stack": "nextjs-supabase",
  "skipPrompts": ["marketing/*"],
  "customOrder": []
}
```

---

## Output Format

All prompts produce findings in this format:

```
[SEVERITY] file:line(s)
Issue: <description>
Impact: <what breaks>
Required fix: <specific action>
```

**Severity Levels:**
- **CRITICAL**: Must fix before shipping
- **HIGH**: Should fix before shipping
- **MEDIUM**: Fix soon
- **LOW**: Nice to have

---

## Contributing

1. Fork the repo
2. Add or improve prompts in `/prompts`
3. Follow the structure in `PROMPT_TEMPLATE.txt`
4. Submit PR

---

## Philosophy

redpen is built on these principles:

1. **System safety before UI polish** — Don't decorate a broken system
2. **Enforcement, not explanation** — Prompts catch bugs, not teach theory
3. **One senior reviewer voice** — Consistent judgment across every audit
4. **Depth without bloat** — Deep analysis prompts are long; guardrails are short

---

## License

MIT

---

## Credits

Built for teams shipping fast with AI. Inspired by how elite engineering orgs review code.
