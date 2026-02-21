---
name: code-review
description: Comprehensive code review for quality, security, and maintainability
triggers:
    - code review
    - review this code
    - review my code
    - review pr
    - review pull request
    - quality check
    - before merge
category: review
---

# Code Review Skill

Conduct a thorough code review for quality, security, and maintainability with severity-rated feedback.

## When to Use

- User requests "review this code" or "code review"
- Before merging a pull request
- After implementing a major feature
- User wants quality assessment of recent changes

## Review Categories

### Security

- Hardcoded secrets, API keys, tokens
- Injection risks (SQL, NoSQL, command)
- XSS and CSRF vulnerabilities
- Authentication and authorization gaps

### Code Quality

- Function size and complexity
- Nesting depth (flag >4 levels)
- Duplicate logic (DRY violations)
- Clear and descriptive naming

### Performance

- Algorithm efficiency (flag O(n²) where O(n) possible)
- N+1 query patterns
- Missing caching opportunities

### Best Practices

- Error handling completeness
- Logging at appropriate levels
- Documentation for public APIs
- No commented-out code left behind

## Severity Rating

- **CRITICAL** — Security vulnerability, must fix before merge
- **HIGH** — Bug or major code smell, should fix before merge
- **MEDIUM** — Minor issue, fix when possible
- **LOW** — Style or suggestion, consider fixing

## Output Format

```
CODE REVIEW REPORT
==================

Files Reviewed: N
Total Issues: N

CRITICAL (N)
HIGH (N)
MEDIUM (N)
LOW (N)

For each issue:
  Location: file:line
  Issue: description
  Risk: impact
  Fix: concrete recommendation

RECOMMENDATION: APPROVE | REQUEST CHANGES | COMMENT
```

## Approval Criteria

- **APPROVE** — No CRITICAL or HIGH issues, minor improvements only
- **REQUEST CHANGES** — CRITICAL or HIGH issues present
- **COMMENT** — Only LOW/MEDIUM issues, no blocking concerns

## Review Checklist

- [ ] No hardcoded secrets or credentials
- [ ] All user inputs sanitized
- [ ] SQL/NoSQL injection prevention in place
- [ ] Authentication and authorization enforced
- [ ] Functions under 50 lines (guideline)
- [ ] No deeply nested code (>4 levels)
- [ ] No duplicate logic
- [ ] Error handling present and appropriate
- [ ] No commented-out code
- [ ] Documentation for public APIs
