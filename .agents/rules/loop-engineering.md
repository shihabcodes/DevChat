# DevChat Autonomous Loop Engineering Protocol

Whenever performing development, bug fixing, security hardening, or UI polishing on DevChat:

## 1. Autonomous Iteration Cycle
Do not pause after a single code edit. Operate in a self-correcting feedback loop:
1. **Implement**: Apply the necessary code, component, or configuration changes.
2. **Execute Verification**: Run `./scripts/verify-production.sh`.
3. **Self-Correct**: If any step fails (security checks, secret leaks, headers, build failures, vulnerabilities, or em dashes):
   - Inspect the exact failure logs.
   - Diagnose the root cause.
   - Modify the code to resolve the failure.
   - Re-run `./scripts/verify-production.sh`.
4. **Repeat**: Continue this loop autonomously until `./scripts/verify-production.sh` completes with exit code 0.
5. **Ship**: Once 100% verified, stage all files, create a short 2-word commit message, and push to `origin/main`.

## 2. Strict Invariant Constraints
- **Zero Em Dashes**: Never introduce any em dashes (`—` or `–`) in code, comments, documentation, or commit messages. Use hyphens `-` or colons `:` instead.
- **Strict 2-Word Commit Messages**: Git commit messages must be very short, exactly 2 words (e.g. `Update security`, `Fix headers`, `Polish UI`, `Update loop`).
- **Zero Secret Exposure**: Never commit or track private keys, live API tokens (`sk-`, `ghp_`, `AKIA`), or `.env` credential files.
- **Cloudflare & Network Security**: Always maintain security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) and resolve real client IPs via `cf-connecting-ip`.

## 3. External Manual Configurations
- When external information or credentials are required (such as Google OAuth Client ID/Secret or Cloudflare DNS/WAF tokens), prompt the user with clear instructions.
- Once the user provides the input, resume the autonomous loop immediately without breaking execution flow.
