# DevChat Autonomous Loop Engineering Protocol

Whenever performing development, bug fixing, or UI polishing on DevChat:

## 1. Autonomous Iteration Cycle
Do not pause after a single code edit. Operate in a self-correcting feedback loop:
1. **Implement**: Apply the necessary code, component, or style changes.
2. **Execute Verification**: Run `./scripts/verify-production.sh` directly.
3. **Self-Correct**: If any step fails (type errors, linting, build failures, security vulnerabilities, or em dashes):
   - Inspect the exact failure logs.
   - Diagnose the root cause.
   - Modify the code to resolve the failure.
   - Re-run `./scripts/verify-production.sh`.
4. **Repeat**: Continue this loop autonomously until `./scripts/verify-production.sh` completes with exit code 0.
5. **Ship**: Once 100% verified, stage all files, create a short commit message (2-3 words max), and push to `origin/main`.

## 2. Strict Invariant Constraints
- **Zero Em Dashes**: Never introduce any em dashes (`—` or `–`) in code, comments, documentation, or commit messages. Use hyphens `-` or colons `:` instead.
- **Production Standards**: Client must compile with 0 errors. Dependencies must have 0 vulnerabilities in `npm audit`.
