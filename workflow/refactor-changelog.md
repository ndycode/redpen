# Refactor Changelog

Cut about 60% of the bloat from 27 prompts.

## What changed

Removed:
- Philosophy sections
- "Why this matters" explanations
- Teaching content
- Motivational fluff
- Checkbox lists (replaced with MUST/MUST NOT)

Kept:
- Short guardrail prompts stayed short
- Action prompts clearly labeled
- Deep analysis prompts allowed to be long

## New structure

Every prompt now follows:

1. ROLE - who you are
2. INTENT - what failure this prevents
3. SCOPE - what is covered, what is not, related prompts
4. EXECUTION ORDER - if relevant
5. ENFORCEMENT - MUST and MUST NOT rules
6. RED FLAGS - instant failures
7. OUTPUT FORMAT - consistent severity levels
8. DONE CONDITION - when you are finished

## Categories

- A) Deep analysis: 7 prompts. Long, run occasionally.
- B) Guardrails: 18 prompts. Short, run frequently.
- C) Action/workflow: 2 prompts plus meta files.

## Files touched

Most prompts got trimmed. Key changes:

- `analysis-prompt.txt` - removed 50% prose
- `auth-data-safety-prompt.txt` - removed philosophy, tightened RLS
- `invariant-prompt.txt` - removed teaching, pure enforcement
- `nextjs-rendering-prompt.txt` - removed caching theory
- UI prompts - all converted to short guardrail format

## New files

- `workflow/library-map.txt` - catalog of all prompts
- `workflow/refactor-changelog.md` - this file

## Deprecated

- "MISSION" phrasing (now INTENT)
- "REQUIRED CHECKS" phrasing (now ENFORCEMENT)
- "COMPLETION CRITERIA" phrasing (now DONE CONDITION)
- Verbose template structure
