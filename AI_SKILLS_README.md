# BloodBridge AI Skills Pack — installation and usage

These are **project-local Agent Skills** designed for the BloodBridge one-command starter. They are **instruction files**, not executable app code or automatic new AI models. Applying them alone does **not** implement the missing features. The AI coding tool must be able to read repository files and make changes to use them effectively.

## Install into existing project (recommended)
1. Extract your existing `BloodBridge_One_Command_Starter.zip`.
2. Extract this skills ZIP **into the existing `BloodBridge_Starter/` root**, merging the new files/folders. Existing `frontend/`, `backend/`, `database/`, `.env` and migrations should be retained unchanged.
3. Your root should now include `AGENTS.md`, `CLAUDE.md`, `AI_SKILLS_README.md`, `.agents/skills/`, `.claude/skills/`, `.github/copilot-instructions.md`.
4. Open that directory as the **project/workspace** in an agent that can edit local files. For Codex read `AGENTS.md` + `.agents/skills`; for Claude Code read `CLAUDE.md` + `.claude/skills`; for Copilot use `.github/copilot-instructions.md` and reference relevant SKILL.md in chat. Some tools do not automatically detect these locations; explicitly paste the skill path or core prompt when necessary.
5. Ask the agent to **audit the current branch** and create the smallest implementation first; don't prompt for the entire system in one completion.

## Skill chooser
| Change requested | Read these skills |
|---|---|
| Docker setup, monorepo architecture | `bloodbridge-architecture` |
| Table/ERD/migration | `bloodbridge-database-design` + `bloodbridge-advanced-postgres` |
| Functions/procedure/views/triggers/optimization | `bloodbridge-advanced-postgres` |
| Blood-unit release/reservation/fulfillment | `bloodbridge-inventory-transactions` + `bloodbridge-testing` |
| Express endpoint | `bloodbridge-express-api` + related database skill |
| Location lookup/donation camp | `bloodbridge-geography-camps` + `bloodbridge-express-api` |
| Landing/role dashboard/mobile | `bloodbridge-responsive-ui` |
| Data warehouse | `bloodbridge-warehouse-analytics` + `bloodbridge-advanced-postgres` |
| Testing and QA | `bloodbridge-testing` |
| Pull request/team handoff | `bloodbridge-team-delivery` |

## Copy/paste start prompt
```text
You are working inside our existing BloodBridge_Starter monorepo. Read AGENTS.md, README.md, docs/ARCHITECTURE.md, docs/API_IMPLEMENTED.md, database/migrations/001_schema.sql, and the relevant .agents/skills/bloodbridge-*/SKILL.md. Our highest priority is verified advanced PostgreSQL functionality; do not rewrite implemented routes, use new migrations for schema extensions and keep the root npm run dev one-command setup. Before editing, identify what exists, exact files and API contracts, a minimal plan, expected tests and any safety constraints. Implement only the assigned module, run available tests, update docs, and report changes and tests actually run. Do not claim real-world medical verification.
```

## Known baseline caveats
- The starter has some live API routes plus design-only/placeholder dashboard views. `docs/API_IMPLEMENTED.md` is the actual implemented contract; `docs/PLANNED_OPENAPI.yaml` is proposed work.
- `database/migrations/007_advanced_objects.sql` includes SQL views/functions/procedure/triggers. Verification against a **running PostgreSQL** server is still required. SQL experiments are not startup migrations.
- Geography seeds are demonstration records, not official complete GN/DS lists.
- The starter uses JavaScript ESM/JSX, not TypeScript. Preserve existing stack under deadline.
- Deadline plan targeted Fri 23 Oct 2026; adapt dates if missed, not the safety/quality acceptance gates.
- Uploaded academic brief limits group size to five; instructor approval is necessary for six members.

## Team handoff
Use `PROMPTS_FOR_6_MEMBERS.md` for six individually scoped AI task prompts and `AI_TASK_TEMPLATE.md` for consistent branch/PR output.
