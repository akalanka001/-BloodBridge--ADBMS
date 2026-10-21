# BloodBridge — prompt and pull-request handoff template

```text
ROLE / MEMBER: [1..6], [feature branch]
TASK: [one bounded feature, e.g. list available component units for verified blood bank]
RELEVANT SKILLS: [.agents/skills/bloodbridge-.../SKILL.md]
READ FIRST: [exact existing files]
CURRENT IMPLEMENTATION: [what is working vs missing; verify, don't assume]
DATABASE IMPACT: [new 010_... migration? views/function/procedure/trigger? or none]
API CONTRACT: [method, path, request, response, error, authorization]
UI SCOPE: [desktop/mobile screen and required empty/error states]
TESTS: [positive, failure, permission, concurrency if transaction]
ACCEPTANCE: [measurable, end-to-end checks]
GUARDRAILS: no real clinical decisions, no PII leak, preserve npm run dev
OUTPUT: files changed, SQL migration instructions, tests run/logs, screenshots, open issues
```

## Definition of done checklist
- [ ] Read root agent rules and matching skills
- [ ] Existing schema and API reviewed; change requested is not already available
- [ ] New migration is incremental and ERD/constraint update is included if required
- [ ] API documentation reflects *implemented* route, not unbuilt plan
- [ ] Frontend uses relative `/api/v1/`, responsive behavior and accessible states
- [ ] Unit/integration/SQL/security tests added and run, or explicitly listed as NOT RUN
- [ ] No secrets committed; all fixtures synthetic
- [ ] Cross-module integration demonstrated; root startup kept intact
- [ ] Reviewer identified; handoff report includes results and blockers
