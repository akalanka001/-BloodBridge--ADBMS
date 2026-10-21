# BloodBridge — Claude Code project guidance
Read `AGENTS.md` first for non-negotiable repository standards. For the specific user task, open the matching `.claude/skills/bloodbridge-*/SKILL.md`. These are the same skill definitions as `.agents/skills`, mirrored for compatibility. Do not invent commands or mark database/API work as finished without tests.

When asked to develop a feature, first report: (a) existing route/schema, (b) exact files to change, (c) database-first migration plan, (d) tests, (e) what remains out of scope. The documentation under `docs/API_IMPLEMENTED.md` is authoritative about what the starter already supports.
