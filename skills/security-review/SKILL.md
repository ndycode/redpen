---
name: security-review
description: Comprehensive security audit checking OWASP Top 10, secrets, and unsafe patterns
triggers:
    - security review
    - security audit
    - owasp
    - vulnerability scan
    - find vulnerabilities
    - check for secrets
    - before deploy
category: security
---

# Security Review Skill

Conduct a thorough security audit checking for OWASP Top 10 vulnerabilities, hardcoded secrets, and unsafe patterns.

## When to Use

- User requests "security review" or "security audit"
- After writing code that handles user input
- After adding new API endpoints
- After modifying authentication or authorization logic
- Before deploying to production
- After adding external dependencies

## Audit Areas

### OWASP Top 10

- A01: Broken Access Control
- A02: Cryptographic Failures
- A03: Injection (SQL, NoSQL, Command, XSS)
- A04: Insecure Design
- A05: Security Misconfiguration
- A06: Vulnerable and Outdated Components
- A07: Identification and Authentication Failures
- A08: Software and Data Integrity Failures
- A09: Security Logging and Monitoring Failures
- A10: Server-Side Request Forgery (SSRF)

### Secrets Detection

- Hardcoded API keys in source
- Passwords or tokens in code
- Private keys committed to repo
- Connection strings containing credentials

### Input Validation

- User inputs sanitized before use
- SQL queries parameterized (no string concatenation)
- Command injection prevention
- Path traversal prevention
- Output escaping for XSS prevention

### Authentication & Authorization

- Password hashing with bcrypt or argon2
- Session token security
- JWT implementation correctness
- Access control enforcement on all protected resources

### Dependency Security

- Known CVEs in installed packages
- High-severity vulnerabilities
- Outdated dependencies with security fixes available

## Severity Definitions

- **CRITICAL** — Exploitable vulnerability with severe impact (data breach, RCE, credential theft)
- **HIGH** — Vulnerability requiring specific conditions but serious impact
- **MEDIUM** — Security weakness with limited impact or difficult exploitation
- **LOW** — Best practice violation or minor security concern

## Output Format

```
SECURITY REVIEW REPORT
======================

Scope: N files scanned

CRITICAL (N)
HIGH (N)
MEDIUM (N)
LOW (N)

For each finding:
  Location: file:line
  Finding: description
  Impact: what an attacker can do
  Remediation: concrete fix steps
  Reference: OWASP category if applicable

OVERALL ASSESSMENT: SECURE | NEEDS WORK | DO NOT DEPLOY
```

## Remediation Priority

1. Rotate exposed secrets — immediate (within 1 hour)
2. Fix CRITICAL — urgent (within 24 hours)
3. Fix HIGH — important (within 1 week)
4. Fix MEDIUM — planned (within 1 month)
5. Fix LOW — backlog

## Security Checklist

- [ ] No hardcoded API keys, passwords, or tokens
- [ ] All user inputs validated and sanitized
- [ ] SQL queries use parameterization
- [ ] Passwords hashed with bcrypt or argon2
- [ ] JWT tokens properly signed and validated
- [ ] Access control enforced on all protected resources
- [ ] HTML output escaped to prevent XSS
- [ ] No sensitive data in error messages or logs
- [ ] TLS/HTTPS enforced for sensitive data
- [ ] No known CRITICAL or HIGH CVEs in dependencies
