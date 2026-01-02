# redpen 🔴

**Your designated senior engineer.**

redpen is a collection of rigorous checks (prompts) to help you catch bugs, security holes, and design flaws in your code. 

It is designed specifically for people building with **AI tools** like Cursor, Windsurf, or Copilot.

### Why do I need this?

AI coding is fast, but AI often skips the boring safety checks. It might write code that *looks* correct but:
- Leaks user data (missing RLS policies).
- Breaks on mobile phones.
- Creates "ghost data" (missing database transactions).

redpen forces your AI to stop, think, and audit its own work before you ship.

### Installation

Run this in your terminal:

```bash
npm install -g redpen
```

### How it works

Think of redpen as a checklist. You don't "run" it on your code directly; you copy a prompt and give it to your AI.

**The Workflow:**

1. **You write code** (e.g., a new feature in Cursor).
2. **You ask redpen for a check**:
   ```bash
   redpen copy auth-data-safety
   ```
   *(This copies a specialized audit prompt to your clipboard)*
3. **You paste it into the AI chat**:
   > "Audit my last changes using these rules: [PASTE]"
4. **The AI finds the bugs** it missed the first time.

### The Checks (Scope)

redpen covers 9 phases of review. You don't need to run all of them every time, but they are there when you need them.

#### 🔐 1. System Safety (Critical)
Run these before shipping any new backend feature.
- `auth-data-safety`: "Did I accidentally expose other users' data?"
- `data-consistency`: "what happens if the internet cuts out while saving?"
- `invariant`: "Does this break the business rules?"

#### ⚡ 2. Framework & Ops
- `nextjs-rendering`: "Am I caching private data on accident?"
- `operability`: "If this breaks in production, will I know why?"

#### 📱 3. Mobile & UI
Run these after finishing the frontend.
- `ui/mobile-responsive-layout-audit`: "Does this look terrible on an iPhone?"
- `ui/mobile-navigation-and-thumb-reach`: "Can I use this with one hand?"
- `ui/design-tokens-enforcement`: "Am I using consistent colors/spacing?"

#### ✍️ 4. Content & Testing
- `test-generation`: "Write tests that actually fail when things break."
- `content/product-copy-voice-guide`: "Does this sound like a human wrote it?"

### Quick Start Guide

**1. Start a new feature**
Check the recommended order of reviews:
```bash
redpen order
```

**2. Pick a prompt**
Let's say you just finished a database migration.
```bash
redpen next
# or
redpen copy data-consistency
```

**3. Paste and Fix**
Paste the prompt into your AI chat. It will give you a list of "CRITICAL" and "HIGH" issues. Fix them.

**4. Mark as Done**
```bash
redpen done data-consistency
```

### FAQ

**Is this a linter?**
No. A linter checks commas and brackets. redpen checks *logic* and *architecture*.

**Do I need to be a senior engineer to use this?**
No! This tool helps you *think* like one. It teaches you (and your AI) what to look for.

**Does it work with any tech stack?**
It is optimized for **Next.js** and **Supabase/PostgreSQL**, but the principles (mobile, safety, invariants) apply to almost any web project.
