# CV Writing Rules - Do Not Deviate From Them

## Rule 1: Every bullet must answer three questions
Every experience line in the CV must clearly answer three questions, within the sentence itself:
1. **What you did** - the concrete action, not a general description of the role
2. **How you did it** - the specific tool, method or technology
3. **Why it matters to a recruiter** - the result or impact, in terms a recruiter understands (time, money, quality, scope)

Bad example: "Responsible for developing server-side features"
Good example: "Built a caching layer in Node.js that cut response time by 40%, which made it possible to support 3x more concurrent users without a server upgrade"

## Rule 2: No generic role descriptions without a result
Do not list a role or responsibility without the result that came with it. If there is no real measurable result in the data, describe the process instead of the title.

## Rule 3: No exaggeration that a single fact does not support
Any follow-up question about a bullet must lead to one clear answer. If there are several possible versions of the same achievement, use only the version the raw_facts explicitly support.

## Rule 4: No "we" without "I"
For personal projects (StudIQ, ExchangeLocator, the job search agent), always write in the first person singular ("I developed", "I built"), never "we developed", unless there really were partners.

## Rule 5: No one-size-fits-all wording
Do not use the same bullet line for two different jobs. Every bullet must be tailored to the keywords and requirements extracted from the current job posting.

## Rule 6: Banned phrases (AI-sounding)
Do not use the following phrases or their equivalents in any language:
- spearheaded / championed / leveraged / passionate about
- responsible for / worked on / helped with
- "responsible for" with no result after it
- "worked on" with no concrete detail
- any sentence that opens with a lofty adjective ("leading", "innovative", "groundbreaking") without a supporting fact

## Rule 7: Numbers must be real
Never invent percentages or numbers. If there is no number in the data (raw_facts), do not write one. Describe the process and the qualitative result instead.

## Rule 8: Match the job requirements
Out of all the projects and facts in the data, select and write first what is most relevant to the keywords extracted from the job posting. Do not dump all the experience in. Prioritize.

## Rule 9: The CV language is always English
The CV is written in English and always stays in English, **regardless of the language of the job posting**. Even if the job description is entirely in Hebrew, every bullet, every phrase and every word in the CV must be in English only. Do not mix languages in the same sentence (a Hebrew connector between "Hono" and "PostgreSQL" is an example of a mistake: it must be "Hono and PostgreSQL"). Technology and product names (StudIQ, PostgreSQL, Supabase, etc.) stay as they are, but all other text is in English.

## Rule 10: No general ability without an example
Do not write "knows X" or "experienced in X" without showing where X actually appeared in a project.
- Not good: "Experienced in AI integrations."
- Good: "Integrated Claude API into backend workflows to generate personalized learning content from student progress data."

## Rule 11: Use real, precise data, not generic words
Instead of generic terms (user data, workflows, business logic, AI features), use the specific name from the raw_facts (student progress data, lesson workflows, conversion history, API endpoints, database logic). That is what makes a bullet credible.

## Rule 12: No exaggeration about technologies without real experience
Do not add a technology just because the job posting mentions it, unless the raw_facts explicitly support it. The test: "if the candidate cannot explain it in an interview with a real example, it does not go in." For example, Claude API, REST APIs, PostgreSQL, Supabase or Pandas may be mentioned if they appear in the raw_facts, but never invent "Multi-agent architecture", "Kubernetes" or "AWS production systems" if they do not explicitly appear there.

## Rule 13: Simple wording beats inflated wording
- Not good: "Designed intelligent AI powered data driven solutions."
- Good: "Designed database logic to store student progress and support personalized lesson recommendations."
Simple wording sounds less flashy but is much more credible to a recruiter.

## Rule 14: The Summary describes a person, not a keyword list
The Summary must not be a comma-separated list of technologies. It should read like a natural sentence describing what the person actually did, not like ATS optimization.

## Rule 15: The golden test - "Can I explain this in an interview?"
Before approving a bullet, check: if a recruiter asks "tell me exactly how you did this", is there a clear answer in the raw_facts? If yes, the bullet is good. If not, soften it, make it more precise, or remove it.

## Template for a good bullet
`[action verb] + [what you built or worked on] + [with which technology or how] + [why it mattered]`
Example: "Developed REST API endpoints using TypeScript, Hono, PostgreSQL, and Supabase to connect frontend actions with backend data."

## Words to be skeptical of (not banned, but suspicious without a clear example right after them)
scalable, robust, cutting-edge, AI powered solutions, data driven solutions, intelligent workflows, end-to-end architecture, production-grade, advanced systems, seamless integrations.
Use them only if the sentence itself contains a concrete example right after them.

## Recommended natural verbs
built, developed, integrated, stored, managed, debugged, improved, connected, handled, maintained, refined, supported.

---

# Over-Claiming Prevention Rules - Rules 16-28
The rules above prevent "AI writing". These rules prevent unconscious inflation: wording that makes something look bigger or more professional than what was really done, even if it is not exactly false.

## Rule 16: No "too big" wording for a personal project
Do not present a personal project as if it were a large enterprise system, unless the raw_facts explicitly support it. Suspicious phrases: from the ground up, full backend, production system, real-time, large-scale, enterprise-grade, system architecture, data pipelines, orchestration, cloud infrastructure.
- Not good: "Developed StudIQ's full backend from the ground up."
- Good: "Developed API endpoints, database workflows, student progress tracking, and Claude API integration in StudIQ."

## Rule 17: An overly broad claim - break it into concrete parts
- Not good: "Built an AI backend system for personalized learning."
- Good: "Integrated Claude API into backend workflows to generate personalized learning content from student progress and lesson data."

## Rule 18: No professional term unless it was really built
Terms like pipeline, architecture, orchestration, production, real-time and multi-agent are allowed only with a real example from the raw_facts. If what was actually built is an API plus database logic, that is not necessarily a "pipeline".

## Rule 19: AI/LLM only through a real, concrete action
Do not write "LLM experience", "AI backend systems" or "Generative AI workflows" without a clear action. Always specify: which API, where it was connected, what input, what output.

## Rule 20: Do not present a result as measured if there was no real measurement
Words like improved, optimized, reliable, faster and real-time need care. Without a real measurement, describe the process and its qualitative impact, and do not hint at a number.

## Rule 21: Distinguish an existing feature from a general ability
Every ability that appears in a bullet must be anchored in a real feature, not a general heading ("Experience with backend data workflows" is bad, "Built backend workflows to manage student records, lesson sequencing, and progress tracking" is good).

## Rule 22: "real-time" and "production" only with proof
"real-time" is allowed only if there is a real WebSocket, live update, streaming or polling in the raw_facts. "production" is allowed only if the system actually served real users. Otherwise use: "fetch currency data", "support conversion features", "background data updates", "deployed application".

## Rule 23: The Summary has no claim without a bullet that proves it
Every ability in the Summary must also appear as an explicit bullet in one of the projects. If no bullet proves it, remove it from the Summary.

## Rule 24: Skills have exactly three levels
Every Skill is classified by skills_pool: "used"/"built" (actually used in a project), "familiar" (learned the basics, add "Fundamentals" where relevant), or not included at all (not used and cannot explain it).

## Rule 25: For every job, also decide what to leave out
Before writing, treat each item's risk_gap and cannot_claim as a "Do not claim" list. This is a built-in part of the process, not a suggestion.

## Rule 26: Every bullet can be explained in 30 seconds in an interview
If there is no clear answer within 30 seconds to "tell me exactly how you did this" (file or module, API or DB involved, input, output, which problem it solved), the bullet does not go in.

## Rule 27: Accuracy always beats nice wording
Between a "nice" sentence (Built intelligent backend systems for personalized learning) and a precise one (Designed database logic to store student progress, identify learning gaps, and support lesson recommendation queries), always choose the precise one.

## Rule 28: Overclaim Check before approving any version
Before approving any bullet, Summary or Skill, run this check: does it sound too broad, too senior or too measured without proof? Does it sound like a company-scale system? Can it be explained from the actual facts? Any sentence that sounds broader than the actual facts must be narrowed to the concrete component (the API, the table, the workflow, the feature) that was really built. Avoid terms like full backend, production system, real-time, architecture, pipeline, orchestration and scalable, unless the raw_facts explicitly support them. Always prefer concrete, project-based wording over a broad professional claim.

---

# Role Detection and Field-Specific Tailoring Rules - Rules 29-35

## Rule 29: Detect the role_type before writing
Before any writing, the job is classified into one role_type: Backend, Frontend, Full Stack, Data/ETL, AI/LLM, Mobile, DevOps/Cloud, QA/Automation, or Product/Support Tech. What to emphasize in every bullet, Summary and Skills list depends on this role_type. It happens automatically during requirement extraction and cannot be skipped.

## Rule 30: Emphasis table by role_type
The same project (for example StudIQ) is emphasized from a different angle for each role_type, as long as the raw_facts genuinely cover it:

| role_type | Emphasize | Be careful with (without real coverage) |
|---|---|---|
| Backend | REST APIs, database logic, authentication, backend workflows, debugging | scalable architecture, distributed systems, production backend |
| Frontend | React components, forms, responsive interfaces, user flows | pixel-perfect, advanced UX, design system |
| Full Stack | frontend + backend + database together, the complete user flow | - |
| Data/ETL | SQL queries, data processing, API data, database workflows | ETL pipelines, big data, analytics platform |
| AI/LLM | Claude API integration, prompt input/output, personalized content generation | AI agents, orchestration, autonomous systems, GenAI platform |
| Mobile | Kotlin, MVVM, Room, Retrofit, WorkManager, Firebase | production Play Store release, multi-module architecture |
| DevOps/Cloud | deployment basics, environment configuration, GitHub workflow | cloud infrastructure, production deployment, Kubernetes |
| QA/Automation | debugging, reliability, test-oriented thinking | test automation frameworks without real experience |
| Product/Support Tech | communicating with users or students, solving technical problems, explaining | actual product management if there was none |

## Rule 31: Bullet length - up to 1-2 lines
A bullet that is too long is a problem even if it is accurate. If a bullet runs past 2 lines in the layout, shorten or split it. Do not leave one overloaded sentence.

## Rule 32: Do not change the project's identity
StudIQ may be presented as a "Full Stack Learning Platform" or a "Backend and Data Driven Learning Platform" depending on context, but it must never become an "Enterprise AI Platform" or a "Multi-Agent Learning System". That is a change of identity, not a change of emphasis.

## Rule 33: The naturalness test without the job posting
Every version must sound like a real description of the experience, even to someone who has not read the job posting. If it sounds like words were pasted in from the posting, the wording is over-tailored and needs to be softened.

## Rule 34: Never change the level of experience for ATS
Changing order and emphasis is fine (for example Node.js before React for a Backend role). Adding a technology that was not used (AWS just because the job asks for it) is not, and neither is describing an ability at a higher level than it really was (multi-agent orchestration when no real agent was built).

## Rule 35: Good tailoring also means removing things
For every job, ask explicitly: what should be removed or toned down because it distracts from this role? (For example: for a Backend role, drop UI-heavy bullets. For a Data role, emphasize SQL and data flow and drop React.)

---

## Final Quality Gate (the last check before approving any version)
Before approving any CV version, verify that every Summary sentence, Skill, Expertise item, and project bullet is supported by a concrete project fact. The wording must be specific enough to answer "what did you do, how did you do it, and why does it matter for this role," but not broader than the actual work performed. If a phrase sounds more senior, larger-scale, more AI-heavy, or more production-like than the real project, narrow it to the exact API, database logic, data entity, workflow, or feature that was actually built.

---

# Additional Rules - Required Input, Single Source of Truth, and Orphan Claims (36-50)

## Rule 36: Required input before tailoring
Before tailoring, the following must be available: the job description, the raw_facts data, skills_pool with honest levels, cannot_claim for each item, and the role_type. The system (generate.js) already enforces this structurally: if input is missing, the run fails early instead of continuing on a guess.

## Rule 37: Raw facts are the single source of truth
You may rephrase, prioritize, shorten, or change the angle of an existing fact. You must **never** invent scope, scale, users, metrics, architecture, cloud usage, production usage, or business impact that is not in the raw_facts.

## Rule 38: Evidence Map - every claim needs a line of proof
Every claim in the CV (Summary, Skill, Expertise, bullet) must be traceable to: where it appears, which project supports it, which specific raw_fact, and which job requirement it serves. This is enforced in code by `checkSummaryGrounding` (against the real raw_facts) and `checkOrphanClaims` (against the bullets actually written in this run).

## Rule 39: Recruiter intent before keywords
Before matching on keywords alone, identify: what problem the company needs to solve, what the candidate will do day to day, what proof the recruiter wants to see, and what would make the recruiter doubt the candidate.

## Rule 40: Handling gaps - do not hide them and do not inflate them
If the job requires something the candidate does not have, there are only three options: leave it out of the CV, mark it as Fundamentals if there is real basic knowledge, or address it gently in an accompanying message (not in the CV itself) as a willingness to learn. Never turn a gap into a fake skill.

## Rule 41: Claim Strength Ladder - verb by level of truth
Built/Developed only if the candidate actually built it. Integrated only if they connected an external API or service into a working flow. Designed only for a schema, logic or structure the candidate can explain. Used for tools that were part of an implementation. Familiar with/Fundamentals for basic learning only. **Never, under any circumstances**: owned, led, architected, scaled, productionized, orchestrated, unless explicitly true.

## Rule 42: The Summary is proof first
Every sentence in the Summary must be traceable to a project bullet, an education item, or real experience. No keyword lists, no inflated identity, and no claim broader than the actual evidence.

## Rule 43: A Skill is either proven or marked as basic
Every Skill is either a Project Skill (appears in a real project bullet), a Fundamentals Skill (explicitly marked as such), or removed entirely if there is no proof and no honest basic explanation.

## Rule 44: Order by what the recruiter needs to see first
The first 10 seconds of the CV should show the strongest fit: Summary, then Skills, then the title of the most relevant project, then its first two bullets. The first or second bullet must directly support the job's main requirement.

## Rule 45: Not every project gets the same weight for every job
Decide the weight for each job: the primary and secondary project get the same fixed number of bullets (4 each), but **which fact** is chosen from the raw_facts is what changes per job. Work experience (tutoring) is completely fixed: 3 bullets, never rewritten. **Enforced in code**: `rewriteBullets` picks exactly the 4 most relevant raw_facts for each project, which keeps the layout fixed and consistent on every run, regardless of how many raw_facts there are in total.

## Rule 46: Interview defense for every bullet
For every bullet: which file or module was involved, what the input was, what the API or DB did, what the output was, which problem it solved, and why it is relevant to the job. Without a clear answer, the bullet is softened or removed.

## Rule 47: No "orphan" claims
A claim cannot appear just once without backing. If the Summary claims something, it must also appear in Skills/Expertise and in an explicit project bullet **within the same run**. This is exactly the check that failed in the past (the Summary claimed LLM experience with no bullet showing it), and it is now enforced automatically in code.

## Rule 48: Softening rules - how to soften without deleting
production system → deployed project / working application. data pipeline → data flow / backend workflow. architecture → backend structure / schema logic. real-time → background updates / API-based updates. advanced AI → Claude API integration. full backend → API endpoints, database workflows, backend logic. Pandas → Pandas Fundamentals. cloud infrastructure → Cloud Basics (only if true).

## Rule 49: The final output includes "what changed and why"
Every run also produces a short rationale file (not just a PDF): which role_type was detected, what was emphasized, what was not claimed and why, and which risks or gaps were found. It is saved next to the PDF in `output/` for transparency.

## Rule 50: A short audit before final approval
Before "ready to send": the Summary claims are proven, Skills are proven or marked Fundamentals, Expertise is proven, there are no banned AI-sounding phrases, no unbacked senior terms, no fake metrics, no unproven keywords from the job posting, the main requirement is visible on the first scan, and the CV still sounds natural without the job posting.

---

## Final Operating Principle
The goal is not to make the CV sound impressive. The goal is to make the recruiter quickly understand the candidate's real fit for the role. For every job, first understand what the recruiter is screening for, then select only the strongest real evidence from the candidate's projects. Every claim must be specific, explainable, and supported by project facts. If wording sounds too senior, too broad, too AI-generated, or broader than the actual work, narrow it to the exact API, database logic, data entity, workflow, or feature that was actually built.

---

# ATS Rules - Rules 51-60 (with a focus on 51, 55, 58 and 60)

## Rule 51: ATS keyword coverage without inflation
A keyword from the job posting may enter the CV only if: (1) it appears in the raw_facts, (2) it is a direct synonym of something that appears there, or (3) it is marked as Fundamentals. **Enforced in code**: after every run, `computeKeywordCoverage` checks which must_have items are really covered by raw_facts/tech_stack, and reports transparently in the rationale file what is and is not covered, so nothing is ever "assumed" to be covered.

## Rule 52: The exact term plus natural proof, without repetition
If there is a real match for an important term, put it once in Skills or the Summary and prove it once in a bullet. Do not repeat the same word over and over artificially (see also rule 57).

## Rule 53: Synonym mapping
If the job's wording matches exactly what was done, use it. If it is too strong, soften it (the softening table is in rule 48).

## Rule 54: Skills for ATS - only what is really supported
Priority order: (1) must_have items with project proof, (2) supporting technologies from real projects, (3) Fundamentals only if relevant, (4) remove everything unrelated to the role. This is already enforced through `selectSkillsWithAI` + `validateOrFallbackSkills`.

## Rule 55: Do not bury an important keyword in a late bullet
An important, accurate keyword must appear in at least one of: the Summary, Technical Skills, a project title, or one of the first two bullets of the most relevant project. **Enforced in the prompt**: the bullet writing step explicitly says not to leave a strong match at the end.

## Rule 56: Project title - tailoring is fine, changing identity is not
See rule 32. Exactly the same principle, from the ATS point of view.

## Rule 57: No keyword stuffing
A key keyword needs to appear only once in Skills, once in the Summary if it is central, and once in a bullet that proves it. More than that sounds artificial.

## Rule 58: Standard spelling of technology names
TypeScript (not Typescript), JavaScript, Node.js (not NodeJS), Next.js, React, PostgreSQL (not Postgres/PostgresSQL), Supabase, REST API/REST APIs, Claude API, GitHub (not Github), WorkManager, Firebase. **Enforced in code**: `normalizeTechSpelling` fixes this automatically and deterministically in every bullet, Summary and Skill before the final render, so it does not depend on the model following instructions.

## Rule 59: ATS-friendly layout
No text inside images, no tables for core experience content, and no overly creative section names. Section names: Summary, Technical Skills, Projects, Experience, Education, Languages, which is already how our template works. The PDF text must be selectable (guaranteed, because we render real HTML to PDF, not an image).

## Rule 60: Balancing ATS and the recruiter
Before approving, from the ATS side: do the real keywords appear? Are technology names spelled correctly? Do important skills appear both in Skills and in the bullets? Is the text selectable? From the recruiter side: does it sound natural? Is every keyword proven in a bullet? Is there no keyword stuffing? Is the experience credible for a junior candidate? If ATS passes but recruiter trust suffers, rewrite. If recruiter trust holds but real keywords are missing, add them naturally. **Reported in the rationale file**: keyword coverage and all the other quality checks (layout, Hebrew, banned phrases, grounding, orphan claims) are shown together in the same file on every run.

## ATS Operating Principle
Optimize for ATS only through real keyword coverage. Important job keywords enter the CV only if supported by raw_facts, appear naturally in Skills or Summary, and are proven by a project bullet. Never perform keyword stuffing, never add unsupported technologies, and never make the CV sound artificial just for ATS. The final version must pass two scans: ATS must find the real and relevant keywords, and a recruiter must immediately understand the project-based proof behind them.

---

# PDF Safety Pipeline - Rules 61-65 (the final gate before creating a PDF)

## Rule 61: A PDF is created only after the required checks
The agent's final output is a PDF ready to submit, but a PDF must never be created directly from the job description without going through: role_type detection, fit check, requirement extraction, keyword coverage check, evidence against raw_facts, Summary against the bullets, Skills against raw_facts, orphan claims, overclaim, and a recruiter scan. **Enforced in code**: the `runPrePdfAudit` function in `generate.js` is the gate. It runs after all the writing and automatic fixing steps, and before `htmlToPdf`. If `audit.passed === false`, the script **throws an error and produces no PDF at all**. It only writes a `*-AUDIT-FAILED.md` file explaining what failed.

## Rule 62: Every PDF comes with a short audit
Every PDF comes with a separate `*-audit.md` file (not part of the CV itself) that lists: Decision, Role Type, CV Angle, keywords included, main evidence, what was intentionally not claimed, and the results of all checks. The purpose is for you, not the recruiter: to know right away whether the PDF is safe to submit, without reading code or logs.

## Rule 63: No final PDF unless the decision is Apply
Before creating a PDF, the system computes a Decision: Apply / Maybe Apply / Do Not Apply, based on the must_have coverage ratio against raw_facts (**enforced by `computeDecision`**). If the decision is Do Not Apply, `runPrePdfAudit` explicitly fails and no PDF is created. This is a simple heuristic (a coverage ratio), not a perfect judgment, and the audit file presents it as such so you can use your own judgment in borderline cases (Maybe Apply).

## Rule 64: The first bullet of the main project must prove the main requirement
The first or second bullet of the project most relevant to the role_type must show the strongest fit (for example REST APIs or database logic for Backend, Claude API for AI/LLM, Kotlin/Retrofit for Mobile). This is rule 55 applied more specifically to the order within the primary project. **Enforced in the prompt** for bullet writing.

## Rule 65: Never create a PDF when proof for the main keyword is missing
If the job is built around a central keyword (LLM, SQL, Android, Cloud) that has no real coverage in the raw_facts, it does not go into the CV, even if it "would help with ATS". **Enforced in code**: `computeKeywordCoverage` plus the cannot_claim and global_do_not_claim lists checked in `runPrePdfAudit`.

## PDF Safety Operating Principle
The agent's final product is a ready-to-submit PDF, but PDF generation is allowed only after all validation checks pass. The agent must first analyze the job, classify the role type, extract must-have requirements, map them to raw_facts, select truthful ATS keywords, build a grounded CV, and run a final audit. If a claim is not supported by raw_facts or cannot be explained in an interview, it must not appear in the PDF. The agent must never create a PDF by copying job keywords directly into the CV.
