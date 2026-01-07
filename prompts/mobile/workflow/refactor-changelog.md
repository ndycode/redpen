# Mobile Prompt Refactor Changelog

2026-01-02

Standardized 23 prompts. Added ROLE, INTENT, SCOPE, EXECUTION ORDER, ENFORCEMENT, RED FLAGS, OUTPUT FORMAT, DONE CONDITION to each.

## New files

- `workflow/library-map.txt` - all 23 prompts cataloged with purpose, category, overlaps
- `workflow/run-order.txt` - 8 phases from system safety through hygiene

## Root prompts

| Prompt | Changes |
|--------|---------|
| analysis-prompt.txt | Added INTENT, SCOPE, DONE CONDITION. Master forensic audit. |
| auth-session-safety-prompt.txt | Added SCOPE for tokens/sessions. Cross-refs security-privacy. |
| mobile-blast-radius-prompt.txt | Added SCOPE for change impact. Cross-refs maintainability. |
| mobile-data-consistency-prompt.txt | Added SCOPE for sync/idempotency. Cross-refs invariant. |
| mobile-dependency-risk-prompt.txt | Added INTENT, SCOPE, DONE CONDITION. |
| mobile-human-error-prompt.txt | Added INTENT, SCOPE, DONE CONDITION. |
| mobile-invariant-prompt.txt | Added SCOPE for business rules. Cross-refs data-consistency. |
| mobile-operability-prompt.txt | Added SCOPE for incident response. Cross-refs observability. |
| mobile-release-ci-prompt.txt | Added INTENT, SCOPE, DONE CONDITION. |
| mobile-security-privacy-prompt.txt | Added SCOPE for storage security. Cross-refs auth-session. |
| optimization-prompt.txt | Added SCOPE for system perf. Cross-refs ui-performance. |
| test-generation-prompt.txt | Marked Category C. Kept procedural. |

## UI prompts

| Prompt | Changes |
|--------|---------|
| mobile-design-tokens-enforcement | Cross-refs consistency-audit. |
| mobile-error-recovery | Cross-refs operability. |
| mobile-long-term-maintainability | Cross-refs blast-radius. |
| mobile-observability-signal-quality | Cross-refs operability. |
| mobile-ui-accessibility | Standard structure. |
| mobile-ui-components-audit | Cross-refs consistency-audit. |
| mobile-ui-consistency-audit | Cross-refs components-audit. |
| mobile-ui-performance | Cross-refs optimization. |
| mobile-ui-redesign | Marked Category C. |
| mobile-ux-flow-friction | Cross-refs error-recovery, accessibility. |
| ui-anti-ai-slop-redesign | Marked Category C. Cross-refs mobile-ui-redesign. |

## Categories

| Type | Count |
|------|-------|
| A - Deep Analysis | 20 |
| B - Guardrail | 0 |
| C - Workflow | 3 |

Category C (procedural, not inflated):
- test-generation-prompt.txt
- ui/mobile-ui-redesign-prompt.txt
- ui/ui-anti-ai-slop-redesign-prompt.txt

## Overlap pairs resolved

Six pairs now cross-reference each other:

1. auth-session / security-privacy
2. data-consistency / invariant
3. blast-radius / maintainability
4. operability / observability
5. optimization / ui-performance
6. components-audit / consistency-audit
