---
name: analyze
description: Deep analysis and investigation of code, architecture, bugs, and performance
triggers:
    - analyze
    - investigate
    - debug
    - why does
    - what's causing
    - root cause
    - dependency analysis
category: analysis
---

# Analyze Skill

Perform deep investigation of architecture, bugs, performance issues, and dependencies, returning structured findings with evidence.

## When to Use

- User says "analyze", "investigate", "debug", "why does", or "what's causing"
- User needs to understand a system's architecture or behavior before making changes
- User wants root cause analysis of a bug or performance issue
- User needs dependency analysis or impact assessment for a proposed change
- A complex question requires reading multiple files and reasoning across them

## Do Not Use When

- User wants code changes made — execute the changes directly
- User wants a full plan with acceptance criteria — help them plan instead
- User wants a quick file lookup or symbol search — just read and answer directly
- User asks a simple factual question answerable from one file

## Steps

1. **Identify the analysis type**: Architecture, bug investigation, performance, or dependency analysis
2. **Gather relevant context**: Read or identify the key files involved
3. **Perform deep analysis**: Reason across files, trace execution paths, identify root causes
4. **Return structured findings**: Present with evidence, file references, and actionable recommendations

## Output Format

- Root cause identification (not just symptoms)
- Specific file:line references for each finding
- Severity assessment where applicable
- Actionable recommendations

## Final Checklist

- [ ] Analysis addresses the specific question or investigation target
- [ ] Findings reference specific files and line numbers where applicable
- [ ] Root causes are identified (not just symptoms) for bug investigations
- [ ] Actionable recommendations are provided
- [ ] Analysis distinguishes between confirmed facts and hypotheses
