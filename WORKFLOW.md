# Core Engine workflow

No GitHub Actions, no Anthropic API key. The agent writes the content and the pipeline checks it.
Only `scripts/generate.js` (deterministic checks + template) produces PDFs, and it does so only when the Pre-PDF Audit passes.


## Inputs
- `data/master-data.json`: the only source of truth (raw_facts, tech_stack, cannot_claim, skills_pool, role_targets, global_do_not_claim)
- `data/writing-rules.md` (rules 1-65) and `data/banned-phrases.json`: the writer must follow these. The code enforces banned phrases, grounding, orphan claims, Hebrew, the skills pool and A4 fit.
- `templates/resume.html`, rendered with `fonts/fonts.conf` (maps Helvetica Neue and Arial to Liberation Sans for consistent rendering)
- `content.json`: written by the agent for each job (schema below)

## content.json schema (same shapes the AI steps used to return)
```json
{
  "job_description": "free text / source link (info only)",
  "requirements": { "job_title": "exact title as written in the posting", "role_type": "Backend|Frontend|Full Stack|Data/ETL|AI/LLM|Mobile|DevOps/Cloud|QA/Automation|Product/Support Tech",
    "must_have": ["concrete mandatory tech only"], "nice_to_have": [], "keywords": [], "risk_gap": [],
    "company": "only if explicit", "application_email": "only if the JD asks to email a CV" },
  "bullets": [ {"id": "<primary project id>", "bullets": ["4 bullets, 90-160 chars, from raw_facts only"]},
               {"id": "<secondary project id>", "bullets": ["..."]} ],
  "summary": "3 sentences, <=480 chars, only techs that appear in the bullets",
  "skills": { "col1": ["<=6 from skills_pool"], "col2": ["<=6"] },
  "email_paragraph": { "he": "no hyphens", "en": "..." }
}
```
- The project pair is fixed by `role_targets[role_type]` (for example Full Stack = taskboard + weatherapp in the example data). Bullets must be supplied for exactly those ids.
- `job_title` is the exact title from the posting. It is used in the application email and in the PDF filename. If it is missing, the run prints a warning and falls back to the role type.
- Experience bullets are injected verbatim from master-data. Don't supply them.
- `email_paragraph` is used only when `application_email` is set.
- Full working example: `test/sample-content.json`.

## Run
```bash
./run.sh path/to/content.json            # add --no-cache to skip reuse of an identical past run
```
`run.sh` sets `FONTCONFIG_FILE`, runs `node scripts/generate.js --content ...`, then archives the outputs.

## Behaviour vs. original
- All `client.messages.create` steps (extract requirements, summary, skills, bullets, judge, email paragraph) now read from content.json.
- The AI "auto-fix" loops (banned phrases, Hebrew, summary rewrites) no longer rewrite anything. The deterministic sanitizers and the final Pre-PDF Audit still run unchanged. If they fail, no PDF is made: fix content.json and re-run.
- **A4 overflow is a hard fail.** No PDF is made, `output/*-AUDIT-FAILED.md` is written, and the exit code is 1. There is no auto-shortening and no silent bullet dropping.
- renderHtml, checkOverflow, runPrePdfAudit, htmlToPdf, the requirements JSON, audit.md and the history cache are unchanged.
- **Rule 63 is enforced:** if the final Decision is not exactly `Apply`, no PDF is made. The run writes `-requirements.json` and `-DECISION-BLOCKED.md` (why: uncovered must_have, risk_gap, summary) and exits 1. Only the owner can change this rule.

## Outputs
- `<Base>` is `<First>_<Last>_<Job_Title>_CV` from `personal.name` and `requirements.job_title` (for example `John_Doe_Junior_Full_Stack_Developer_CV.pdf`). No company in the name. The `history/` copy adds a timestamp prefix so it stays unique.
- `output/<Base>.pdf`, `<Base>-audit.md`, `<Base>-requirements.json` (+ `-email-draft.json`), or on a block: `-AUDIT-FAILED.md` or `-DECISION-BLOCKED.md` with no PDF
- Every run (pass or fail) is copied to `history/<YYYYMMDD-HHMMSS>_<file>` together with the `content.json` used.

## Hard stops and approval
- No PDF is produced when the Pre-PDF audit fails (`-AUDIT-FAILED.md`), the decision is not exactly `Apply` (`-DECISION-BLOCKED.md`), the content overflows one A4 page, or a phrase in `base_text.required_everywhere` is missing.
- When a bullet is not found word for word in the base text, or the summary differs from the base summary, the run writes `output/<Base>-NEEDS-OWNER-APPROVAL.md` listing the changes.
- An identical earlier job can be reused from `history/` unless `--no-cache` is passed.

## Files
| Path | Purpose |
|---|---|
| `scripts/generate.js` | All checks, rendering and PDF export |
| `templates/resume.html` | Fixed CV layout. Only content is injected |
| `fonts/fonts.conf` | Font mapping for consistent rendering |
| `data/master-data.example.json` | Example master data with placeholder content |
| `data/writing-rules.md` | Writing rules, in English |
| `data/banned-phrases.json` | Banned phrases list |
| `run.sh` | Runs the pipeline and archives outputs |
