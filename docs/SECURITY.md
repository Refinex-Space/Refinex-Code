<!-- HARNESS:MANAGED FILE -->
# Security Baseline

## Purpose

Encode the minimum security expectations so agents do not erode
important boundaries while moving quickly.

## Baseline

- never commit plaintext secrets
- validate inputs at boundaries
- constrain high-risk external operations explicitly
- sync docs and validation when security-sensitive behavior changes

## Review Priority

1. secrets and credentials
2. permission boundaries
3. input validation
4. logging and sensitive data exposure
