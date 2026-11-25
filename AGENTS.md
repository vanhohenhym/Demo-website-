# AGENTS.md

Entry point for all AI agents working on this project.
Computer and electronics e-commerce demo (Next.js App Router, CMS-agnostic). Products come from an external CMS; this site never uploads products.

**Always read docs/INDEX.md first, then ONLY the docs relevant to the task. Do not scan the whole codebase. After every task update the affected docs.**

---

## CORE OPERATIONAL RULES (NEVER BREAK)

### 1. PHASE GATES
Work proceeds strictly in numbered phases defined in `docs/PHASES.md`.
1. Work ONLY on the current phase. Never start the next phase on your own.
2. If something is requested outside the current phase, record it in `docs/TODO.md`, inform the user, and continue with current phase.
3. Before stopping you must run: `npm run typecheck && npm run lint && npm run build` (and `npm test` if tests exist). Fix every failure first.
4. At the end of a phase, output a **PHASE REPORT**:
   - What was built (short list)
   - Files created/changed
   - How to test it (exact commands and URLs)
   - Acceptance criteria: each one marked pass/fail
   - Known issues and decisions made
   - Docs updated
5. Then STOP. Wait for exact command:
   - `APPROVE PHASE N` -> mark phase done in `docs/PHASES.md` and stop
   - `START PHASE N`   -> begin that phase
   - `FIX: <text>`     -> fix only that, re-run checks, report again
6. In design-image phases, treat EACH uploaded image as a mini-phase: build it, run checks, report, then wait for the next image.
7. Split large tasks into sub-steps, execute the first, and report.

---

### 2. MEMORY SYSTEM
Always maintain all documentation files in `/docs/`.
- At start of EVERY task: read `AGENTS.md` and `docs/INDEX.md`, then ONLY relevant task docs.
- At end of EVERY task: update affected docs, `docs/CHANGELOG.md`, and `docs/INDEX.md`.
- Keep docs short, factual, in tables/lists. If code and docs disagree, fix the docs.

---

### 3. LOGIC SOURCE OF TRUTH
Business logic is specified in `docs/LOGIC/*.md` with test suites in `docs/LOGIC/tests/*.test.json`.
- Read `docs/LOGIC/README.md` first, then the spec for the feature being built.
- Implement exactly as written in `lib/logic/` (pure TypeScript, zero framework dependencies, zero I/O).
- Leapter `choose` blocks are first-match-wins: use `if / else if / else` chains or early returns.
- Implement every DEVIATION (D1 to D8) listed in `docs/LOGIC/README.md`.
- Turn every test case into a unit test and run them before finishing a phase.
- Never edit `docs/LOGIC/` unless explicitly instructed with `UPDATE LOGIC: ...`.
