# Refactor Changelog

## Summary
All 27 prompts refactored to precision spec. ~60% size reduction from previous pass.

## Structure Applied
1. ROLE (seniority + specialty)
2. INTENT (what failure prevented)
3. SCOPE (includes/excludes/cross-refs)
4. EXECUTION ORDER (when needed)
5. ENFORCEMENT CHECKS (MUST/MUST NOT)
6. RED FLAGS (immediate fail)
7. OUTPUT FORMAT (consistent severity)
8. DONE CONDITION (exit criteria)

## Key Changes

### Removed
- All "philosophy" and "why this matters" prose
- Teaching content
- Motivational language
- Redundant explanations
- Checkbox-style lists → MUST phrasing

### Preserved
- Guardrail prompts kept short (not inflated)
- Action prompts clearly marked
- Deep analysis prompts allowed depth

### Classification Applied
- A) Deep analysis: 7 prompts (long, infrequent)
- B) Guardrails: 18 prompts (short, frequent)
- C) Action/workflow: 2 prompts + meta files

## Files Modified

| File | Change |
|------|--------|
| analysis-prompt.txt | Removed ~50% prose, added MUST phrasing |
| auth-data-safety-prompt.txt | Removed philosophy, tightened RLS checks |
| data-consistency-prompt.txt | Separated from auth, pure constraints |
| invariant-prompt.txt | Removed teaching, pure enforcement |
| blast-radius-prompt.txt | Short guardrail format |
| human-error-prompt.txt | Short guardrail format |
| nextjs-rendering-prompt.txt | Removed caching theory, pure checks |
| operability-prompt.txt | Removed philosophy, pure survival |
| optimization-prompt.txt | Removed perf theory, pure blockers |
| test-generation-prompt.txt | Removed test theory, pure gaps |
| content/product-copy-voice-guide-prompt.txt | Short guardrail |
| docs/docs-sync-and-accuracy-prompt.txt | Short guardrail |
| engineering/dx-workflow-and-pr-review-prompt.txt | Short guardrail |
| marketing/content-density* | Short guardrail |
| marketing/nextjs-marketing* | Short guardrail |
| ui/design-tokens* | Short guardrail |
| ui/ui-components* | Short guardrail |
| ui/ui-consistency* | Short guardrail |
| ui/ui-accessibility* | Short guardrail |
| ui/ui-performance* | Short guardrail |
| ui/error-boundary* | Short guardrail |
| ui/ui-redesign* | ACTION prompt, short orchestration |
| ui/ui-anti-ai-slop* | ACTION prompt, short |
| ui/mobile/* (all 6) | Short guardrails, NOT inflated |

## New Files
- workflow/library-map.txt (authoritative map)
- workflow/refactor-changelog.md (this file)

## Deprecated
- Previous verbose template structure
- "MISSION" phrasing (replaced with INTENT)
- "REQUIRED CHECKS" phrasing (replaced with ENFORCEMENT)
- "COMPLETION CRITERIA" phrasing (replaced with DONE CONDITION)
