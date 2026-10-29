import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// NO-API MODE: all writing steps come from a writer-supplied content JSON (--content <file>).
// Deterministic checks, renderHtml, checkOverflow, runPrePdfAudit, htmlToPdf and audit outputs are unchanged.
function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const CONTENT_PATH = argValue("--content") || process.env.CONTENT_JSON;
let CONTENT = null;
async function loadContent() {
  if (!CONTENT_PATH) throw new Error("Missing --content <content.json> (NO-API mode)");
  CONTENT = JSON.parse(await fs.readFile(path.resolve(CONTENT_PATH), "utf-8"));
  for (const k of ["requirements", "bullets", "summary", "skills"]) {
    if (CONTENT[k] === undefined) throw new Error(`content.json missing required key: ${k}`);
  }
  return CONTENT;
}
// Any former AI "fix/rewrite" step: no model available -> keep writer's value unchanged; deterministic gates decide.
const client = {
  messages: {
    create: async () => {
      throw new Error("NO-API mode: AI rewrite step not available - fix content.json and re-run");
    },
  },
};

const MODEL = "claude-sonnet-4-6";
const HEBREW_REGEX = /[\u0590-\u05FF]/;

// Robust JSON extraction - works even if Claude adds an intro or explanation before or after the JSON
function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const firstBraceIdx = cleaned.indexOf("{");
  const firstBracketIdx = cleaned.indexOf("[");
  let start, closeChar;
  if (firstBracketIdx !== -1 && (firstBraceIdx === -1 || firstBracketIdx < firstBraceIdx)) {
    start = firstBracketIdx;
    closeChar = "]";
  } else if (firstBraceIdx !== -1) {
    start = firstBraceIdx;
    closeChar = "}";
  } else {
    throw new Error("No valid JSON found in the response: " + cleaned.slice(0, 300));
  }
  const end = cleaned.lastIndexOf(closeChar);
  if (end === -1 || end < start) {
    throw new Error("No valid JSON found in the response: " + cleaned.slice(0, 300));
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

// Wraps an API call plus JSON parsing, and retries if the JSON is actually malformed
// (for example a missing comma). Code cannot "fix" that, so the model has to be asked again.
async function createAndParseJson(params, label, maxRetries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await client.messages.create(params);
      const text = res.content.find((b) => b.type === "text").text;
      return extractJson(text);
    } catch (err) {
      lastErr = err;
      console.log(
        `  ⚠ ${label}: malformed JSON in the AI response (${err.message.slice(0, 100)}) - retrying (attempt ${attempt + 1}/${maxRetries + 1})...`
      );
    }
  }
  throw new Error(`${label}: failed after ${maxRetries + 1} attempts. Last error: ${lastErr.message}`);
}

async function loadInputs() {
  const masterData = JSON.parse(
    await fs.readFile(path.join(__dirname, "../data/master-data.json"), "utf-8")
  );
  const rules = await fs.readFile(path.join(__dirname, "../data/writing-rules.md"), "utf-8");
  const template = await fs.readFile(path.join(__dirname, "../templates/resume.html"), "utf-8");
  const bannedPhrasesData = JSON.parse(
    await fs.readFile(path.join(__dirname, "../data/banned-phrases.json"), "utf-8")
  );
  return { masterData, rules, template, bannedPhrasesData };
}

// Flattens the two-tier structure (forbidden/risky) into a single list that the rest of the code already understands.
// forbidden is always included. risky is included only if no raw_fact backs it up. If it is real
// (for example "deployed" really appears in a raw_fact), it is not blocked. If it is not real, it is blocked just like forbidden.
function computeEffectiveBannedPhrases(bannedPhrasesData, masterData) {
  const groundTruthText = masterData.projects
    .flatMap((p) => [...p.tech_stack, ...(p.data_entities || []), ...p.raw_facts])
    .concat(masterData.experience.flatMap((e) => e.raw_facts))
    .join(" ")
    .toLowerCase();
  const ungroundedRisky = (bannedPhrasesData.risky || []).filter(
    (phrase) => !groundTruthText.includes(phrase.toLowerCase())
  );
  return [...(bannedPhrasesData.forbidden || []), ...ungroundedRisky];
}

// Step 1: extract requirements from the job posting, structured as must-have / nice-to-have / keywords / risk-gap
async function extractRequirements(jobDescription) {
  // NO-API: requirements written by the writer in content.json (same shape the AI returned)
  const r = CONTENT.requirements;
  const req = { role_type: "", job_title: "", must_have: [], nice_to_have: [], keywords: [], risk_gap: [], company: "", application_email: "", ...r };
  req.job_title = String(req.job_title || "").trim();
  if (!req.job_title) console.warn(`  ⚠ Warning: requirements.job_title is missing - falling back to "${req.role_type || "General"} Developer". Copy the exact title from the posting into content.json.`);
  return req;
}

// Drafts an application email - only when the posting asks candidates to apply to a specific email address.
// Uses the same banned-phrases list so the wording sounds natural and not "AI-written".
async function generateEmailDraft(masterData, requirements, bannedPhrases, keywordCoverage) {
  const personal = masterData.personal;
  const matchedTech = (keywordCoverage.covered || []).join(", ");
  const bannedPhrasesList = (bannedPhrases || []).join(", ");
  const roleTypeLabel = requirements.role_type || "Developer";

  // Only the middle paragraph (what is interesting about the role plus technical background) is written by the AI. The rest of the
  // email is a fixed template in code, so the structure always looks consistent and does not change between runs.
  const res = { content: [{ type: "text", text: `HE: ${CONTENT.email_paragraph?.he || ""}\nEN: ${CONTENT.email_paragraph?.en || ""}` }] };
  const _unusedEmailPrompt = ({
    model: MODEL,
    max_tokens: 200,
    system: `Write exactly ONE short sentence, in both Hebrew and English, that links the candidate's real experience to one key requirement of this job. Follow the writing rules: no invented facts, only technologies listed below, natural and simple wording, no exaggerated enthusiasm, no opening or closing lines.

Critical no-dash rule: do not use en or em dashes (– —) in the text.
No Hebrew maqaf (־) and no en or em dash anywhere. The only allowed dash is the regular hyphen "-".
Hebrew prefix rule: a Hebrew prefix letter (ו, ב, ל, מ, ה, ש, כ) attaches directly to an English word with no hyphen, for example "וPostgreSQL", "בReact", "לGitHub".
Do not use any of these banned phrases: ${bannedPhrasesList}

Return exactly in this format, with no extra text:
HE: <the sentence in Hebrew>
EN: <the same sentence in English>`,
    messages: [
      {
        role: "user",
        content: `Company: ${requirements.company || "(unknown)"}
role_type: ${requirements.role_type}
Technologies actually matched to this job (only these may be mentioned): ${matchedTech}`,
      },
    ],
  });

  const text = res.content.find((b) => b.type === "text").text.trim();
  const heMatch = text.match(/HE:\s*([\s\S]*?)(?=\nEN:|$)/);
  const enMatch = text.match(/EN:\s*([\s\S]*)/);
  const stripHyphens = (s) => (s || "").replace(/[-–—־]/g, "").replace(/\s{2,}/g, " ").trim();
  const paragraphHe = stripHyphens(heMatch ? heMatch[1] : "");
  const paragraphEn = stripHyphens(enMatch ? enMatch[1] : "");

  const nameHe = personal.name_he || personal.name;
  const roleTitle = requirements.job_title || `${roleTypeLabel} Developer`;
  if (!requirements.job_title) console.warn("  ⚠ Warning: no job_title - the email uses the role type instead of the exact posting title.");
  const subjectHe = `${roleTitle} ${nameHe}`;
  const subjectEn = `${roleTitle} ${personal.name}`;

  const company = (requirements.company || "").trim();
  const phoneLine = personal.phone ? `\n${personal.phone}` : "";

  const bodyHe = [
    "שלום,",
    `שמי ${nameHe}, בוגר תואר ראשון במדעי המחשב. ראיתי את המשרה ל${roleTitle}${company ? ` ב${company}` : ""} והיא מאוד עניינה אותי.`,
    paragraphHe,
    "מצורפים קורות החיים שלי, וקישורים לGitHub ולLinkedIn.",
    `GitHub: ${personal.github}\nLinkedIn: ${personal.linkedin}`,
    `תודה ויום טוב,\n${nameHe}${phoneLine}`,
  ].filter(Boolean).join("\n\n");

  const bodyEn = [
    "Hi,",
    `I'm ${personal.name}, a Computer Science graduate. I saw the ${roleTitle} position${company ? ` at ${company}` : ""} and it really interested me.`,
    paragraphEn,
    "My CV is attached, along with links to my GitHub and LinkedIn.",
    `GitHub: ${personal.github}\nLinkedIn: ${personal.linkedin}`,
    `Thank you and have a good day,\n${personal.name}${phoneLine}`,
  ].filter(Boolean).join("\n\n");

  return {
    subject_he: stripHyphens(subjectHe),
    body_he: bodyHe,
    subject_en: stripHyphens(subjectEn),
    body_en: bodyEn,
  };
}

// Step 2: write a Summary tailored to the job - 3 sentences following a fixed pattern
async function generateSummary(masterData, rules, requirements, bullets, bannedPhrases) {
  const allBulletText = bullets.flatMap((b) => b.bullets).join(" ");
  const allTech = [...new Set(masterData.projects.flatMap((p) => p.tech_stack))].filter((tech) => {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(allBulletText);
  });
  const MAX_SUMMARY_CHARS = 480; // roughly 5 lines in the current layout
  const bannedPhrasesList = (bannedPhrases || []).join(", ");
  return String(CONTENT.summary).trim(); // NO-API: writer-supplied summary
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: `You are a professional resume writer. You must follow these writing rules:\n\n${rules}\n\nCritical language rule: everything is in English, even if the job posting is in Hebrew.\n\nCritical inflation rule: do not describe the project as a large enterprise system.\n\nStrictly banned phrases - do not use any of them, not even in similar wording or a close variation: ${bannedPhrasesList}\n\nDo not use the em dash character (—). No Hebrew maqaf (־) and no en dash (–) either; the only allowed dash is the regular hyphen "-".\n\nMost critical rule - Orphan Claims: the Summary may mention only technologies or capabilities that appear explicitly in the bullet text given below. Do not mention any real technology (even one in the general tech_stack) unless it is actually written in one of the bullets selected this time. Otherwise the Summary is "orphaned" and cannot be backed up in this version.`,
    messages: [
      {
        role: "user",
        content: `Write a Summary of exactly 3 sentences, following this pattern:
Sentence 1: who I am and what kind of work I have done, framed by the job's role_type (Backend/Frontend/Full Stack/Data/AI/Mobile, etc.).
Sentence 2: specific proof from the project most relevant to this role_type.
Sentence 3: fundamentals or skills relevant to this job.

Critical length rule: the whole Summary must be at most ${MAX_SUMMARY_CHARS} characters (including spaces), which is about 5 lines in the layout. Concise and precise beats detailed.

Job requirements (including role_type): ${JSON.stringify(requirements)}
Real technologies that exist in principle (reference list only - being listed here is not enough, a technology must also appear in the bullet text below): ${JSON.stringify(allTech)}

The bullets actually selected for this run - **only** technologies or capabilities explicitly mentioned here may appear in the Summary:
${allBulletText}

Return only the Summary text itself, with no JSON, no quotes, and no extra text before or after.`,
      },
    ],
  });
  return res.content.find((b) => b.type === "text").text.trim();
}

// Step 3: select and order Skills from skills_pool only (12 max, 6 per column) by relevance to the job
async function selectSkillsWithAI(masterData, requirements) {
  const roleTarget = masterData.role_targets && masterData.role_targets[requirements.role_type];
  const roleKeywords = (roleTarget && roleTarget.main_keywords) || [];
  if (CONTENT) return CONTENT.skills; // NO-API: writer-supplied {col1, col2}
  return createAndParseJson(
    {
      model: MODEL,
      max_tokens: 500,
      system: `You select Skills for a resume. You may choose only from the given pool. Never invent a Skill that is not in it.`,
      messages: [
        {
          role: "user",
          content: `Full skills pool (with real experience levels): ${JSON.stringify(masterData.skills_pool)}
Job requirements: ${JSON.stringify(requirements)}
The most important keywords for this role_type (put them first if they are covered): ${JSON.stringify(roleKeywords)}

Choose exactly 12 skills from the pool (or fewer if there are not 12), ordered by relevance: first must_have items that are covered, then the role_type keywords, then nice_to_have, then the remaining tools. Do not give a "familiar" level skill high priority unless it is an explicit must_have. **Important**: do not include technologies specific to a completely different field (for example Kotlin/Room/WorkManager/Firebase/Retrofit/Dagger Hilt in a non-Mobile job) unless they are an explicit must_have. They are irrelevant and confuse recruiters.

Important: return only 100% valid JSON, with no extra text, in this format: {"col1": ["...", ...], "col2": ["...", ...]} where each column holds up to 6 items.`,
        },
      ],
    },
    "Skills selection"
  ).catch((err) => {
    console.log(`  ⚠ ${err.message} - falling back to deterministic selection.`);
    return null;
  });
}

// Deterministic safeguard: makes sure every returned Skill really exists in skills_pool.
// If the AI invented something or the format is invalid, fall back to a simple deterministic selection (plain JS, no AI)
function validateOrFallbackSkills(aiResult, masterData, requirements) {
  const poolNames = new Set(masterData.skills_pool.map((s) => s.name.toLowerCase()));
  const chosen = [...(aiResult?.col1 || []), ...(aiResult?.col2 || [])];
  const allValid =
    chosen.length > 0 && chosen.every((name) => poolNames.has(String(name).toLowerCase()));

  if (allValid) return aiResult;

  console.log("  ⚠ The AI returned invalid Skills (not from the pool) - falling back to deterministic selection...");
  const keywords = [
    ...(requirements.must_have || []),
    ...(requirements.nice_to_have || []),
  ].map((k) => k.toLowerCase());

  const levelRank = { built: 0, used: 1, integrated: 0, familiar: 2 };
  const scored = masterData.skills_pool.map((s) => {
    const matches = keywords.some((k) => k.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(k));
    return { ...s, score: (matches ? -10 : 0) + (levelRank[s.level] ?? 1) };
  });
  scored.sort((a, b) => a.score - b.score);
  const top = scored.slice(0, 12).map((s) => s.name);
  const half = Math.ceil(top.length / 2);
  return { col1: top.slice(0, half), col2: top.slice(half) };
}

// Picks exactly 2 projects out of all existing projects, based on role_type.
// It does not just reorder them, it decides which 2 are shown at all (the third one is left out of this run).
function selectProjectPair(requirements, masterData) {
  const roleTarget = masterData.role_targets && masterData.role_targets[requirements?.role_type];
  const pairConfig =
    roleTarget && roleTarget.primary_project && roleTarget.secondary_project
      ? roleTarget
      : masterData.default_project_pair;
  const primary = masterData.projects.find((p) => p.id === pairConfig.primary_project);
  const secondary = masterData.projects.find((p) => p.id === pairConfig.secondary_project);
  return [primary, secondary].filter(Boolean);
}

// Step 4: rewrite the bullets, including cannot_claim for each item (never claim a technology that was not actually used)
async function rewriteBullets(masterData, rules, requirements, bannedPhrases) {
  // Only projects get rewritten. Work experience (tutoring) is always fixed and is
  // injected later in main() exactly as written in raw_facts, untouched.
  const selectedProjects = selectProjectPair(requirements, masterData);
  const allItems = selectedProjects.map((item) => ({
    ...item,
    raw_facts: item.raw_facts.filter((fact) => !fact.trim().startsWith("מלא כאן")),
  }));
  const bannedPhrasesList = (bannedPhrases || []).join(", ");
  // NO-API: writer-supplied bullets for exactly the selected project pair
  const wanted = selectedProjects.map((p) => p.id);
  const got = CONTENT.bullets.filter((b) => wanted.includes(b.id));
  const missing = wanted.filter((id) => !got.find((b) => b.id === id));
  if (missing.length) throw new Error(`content.json bullets missing for selected project(s): ${missing.join(", ")} (pair for role_type "${requirements.role_type}" is ${wanted.join(" + ")})`);
  return wanted.map((id) => got.find((b) => b.id === id));

  return createAndParseJson(
    {
      model: MODEL,
      max_tokens: 2500,
      system: `You are a professional resume writer. You must strictly follow these writing rules, with no exceptions:\n\n${rules}\n\nAnother critical rule: the visual structure of the resume is fixed and must not break. Therefore:\n- For each project, choose **exactly 4** bullets from the raw_facts (no fewer, no more), the ones most relevant to the job\n- Keep every bullet a similar length (roughly 90-160 characters)\n- Do not add headings or new text, only the bullets themselves\n\nCritical language rule: every bullet is in English only, even if the job posting is in Hebrew.\n\nCritical cannot_claim rule: each item comes with a cannot_claim field, a list of things you must never mention or hint at in any wording, even if the job explicitly asks for them.\n\nCritical inflation rule: never describe the projects as large enterprise systems.\n\nStrictly banned phrases - do not use any of them, not even in similar wording or a close variation: ${bannedPhrasesList}\n\nText pattern rule: never use the em dash character (—) anywhere. No Hebrew maqaf (־) and no en dash (–) either; the only allowed dash is the regular hyphen "-".\n\nImportant: return only 100% valid JSON, with no syntax errors.`,
      messages: [
        {
          role: "user",
          content: `Job requirements (including role_type, the type of role): ${JSON.stringify(requirements)}\n\nThe real data pool: ${JSON.stringify(allItems)}\n\nFor each item, **choose exactly 4** of the raw_facts most relevant to this job and rephrase them (if an item has fewer than 4 raw_facts, take all of them). Prioritize facts that support the must_have and the role_type. Emphasize the angle that fits the specific role_type (for example: if role_type is "Data/ETL", emphasize SQL queries and data flow; if "AI/LLM", emphasize API integration and generated content; if "Mobile", emphasize ExchangeLocator and prioritize its bullets). The same project can be framed from a different angle, with different facts chosen, on each run.\n\nCritical placement rule: if a must_have is backed by the raw_facts, it must appear in the first bullet of the most relevant project.\n\nDo not touch cannot_claim. Return JSON in this format: [{"id": "item_id", "bullets": ["...", "..."]}] with exactly 4 bullets per item. JSON only, no extra text.`,
        },
      ],
    },
    "Bullet writing"
  );
}

// Step 5: review - check for banned phrases and exaggerations
async function judgeBullets(rules, bulletsByProject) {
  return bulletsByProject; // NO-API: the writer is the judge; deterministic checks below still gate
  return createAndParseJson(
    {
      model: MODEL,
      max_tokens: 2000,
      system: `You are a strict quality reviewer. Your job is to find violations of the following writing rules and fix them:\n\n${rules}\n\nVery important: your answer must be valid JSON only. Do not add any intro, explanation or summary, not before the JSON and not after it. Start directly with the opening bracket.`,
      messages: [
        {
          role: "user",
          content: `Review the following bullets. If any rule is violated, fix the bullet. Otherwise leave it as is. Return exactly the same JSON format, with no extra text before or after: ${JSON.stringify(bulletsByProject)}`,
        },
      ],
    },
    "Bullet review"
  );
}

// ===== Deterministic checks (not AI) - they work on a generic structure [{id, bullets:[...]}] =====
// This lets the same functions run on both the project bullets and the summary/skills,
// by wrapping them in the same structure (id: "summary", bullets: [summaryText], etc.)

function checkBannedPhrases(bulletsById, bannedPhrases) {
  const violations = [];
  for (const item of bulletsById) {
    item.bullets.forEach((bulletText, idx) => {
      const lowerText = bulletText.toLowerCase();
      for (const phrase of bannedPhrases) {
        if (lowerText.includes(phrase.toLowerCase())) {
          violations.push({ id: item.id, bulletIndex: idx, phrase, text: bulletText });
        }
      }
    });
  }
  return violations;
}

function checkHebrewText(bulletsById) {
  const violations = [];
  for (const item of bulletsById) {
    item.bullets.forEach((bulletText, idx) => {
      if (HEBREW_REGEX.test(bulletText)) {
        violations.push({ id: item.id, bulletIndex: idx, phrase: "(Hebrew characters)", text: bulletText });
      }
    });
  }
  return violations;
}

// Deterministic "Evidence Map" - makes sure every technology mentioned in the Summary
// really exists in the actual tech_stack of some project (not just in skills_pool in general,
// because skills_pool also holds "familiar" level items that must not be claimed in the Summary).
// Capability labels (not concrete technology names) are by nature a paraphrase of raw_facts,
// not a literal quote, so they are exempt from the string-matching grounding/orphan checks.
// Their credibility was already confirmed when skills_pool was built and cannot be verified textually.
const CAPABILITY_LABELS = ["API Integrations", "Backend Workflows", "Data Processing"];

// Dedicated check - a "familiar" level Skill (like "Python Fundamentals") mentioned in the Summary
// without the accompanying word "Fundamentals" is exactly an inflated claim: "Solid foundations in Python"
// sounds like real project experience when it was really just a course. It slipped past checkSummaryGrounding because
// there the pool entry is "Python Fundamentals" as a whole, and it was never checked against "Python" alone.
function checkFundamentalsQualifier(summary, masterData) {
  const violations = [];
  for (const skill of masterData.skills_pool) {
    if (skill.level !== "familiar" || !skill.name.endsWith(" Fundamentals")) continue;
    const baseName = skill.name.replace(/ Fundamentals$/, "");
    const escapedBase = baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const bareRegex = new RegExp(`\\b${escapedBase}\\b(?!\\s+Fundamentals)`, "i");
    if (bareRegex.test(summary)) {
      violations.push({ id: "summary", phrase: baseName, text: summary });
    }
  }
  return violations;
}

function checkSummaryGrounding(summary, masterData) {
  const groundTruthText = masterData.projects
    .flatMap((p) => [...p.tech_stack, ...(p.data_entities || []), ...p.raw_facts])
    .join(" ")
    .toLowerCase();
  const violations = [];
  for (const skill of masterData.skills_pool) {
    if (CAPABILITY_LABELS.includes(skill.name) || skill.level === "familiar") continue;
    const escaped = skill.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (!regex.test(summary)) continue;
    const lower = skill.name.toLowerCase();
    // Basic singular/plural check - "REST APIs" vs "REST API", as in computeKeywordCoverage
    const isGrounded =
      groundTruthText.includes(lower) ||
      (lower.endsWith("s") && groundTruthText.includes(lower.slice(0, -1)));
    if (!isGrounded) {
      violations.push({ id: "summary", phrase: skill.name, text: summary });
    }
  }
  return violations;
}

// Orphan Claim Check - different from checkSummaryGrounding: it does not check whether a claim is "true in general",
// but whether it is actually backed by the bullets written *in the current run*. A claim can be completely true
// (backed by raw_facts) and still be "orphaned" if the AI did not include a bullet showing it in this version.
// Deterministic check - the Summary must not exceed about 5 lines (character limit)
function checkSummaryLength(summary, maxChars = 480) {
  return summary.length > maxChars;
}

function checkOrphanClaims(summary, bulletsById, masterData) {
  const allBulletText = bulletsById
    .flatMap((b) => b.bullets)
    .join(" ")
    .toLowerCase();
  const violations = [];
  for (const skill of masterData.skills_pool) {
    if (CAPABILITY_LABELS.includes(skill.name) || skill.level === "familiar") continue;
    const escaped = skill.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (!regex.test(summary)) continue;
    const lower = skill.name.toLowerCase();
    const isBacked =
      allBulletText.includes(lower) ||
      (lower.endsWith("s") && allBulletText.includes(lower.slice(0, -1)));
    if (!isBacked) {
      violations.push({ id: "summary", phrase: skill.name, text: summary });
    }
  }
  return violations;
}

// Rules 61-63 - explicit decision: is this job worth applying to at all, based on actual must_have coverage.
// This is a simple heuristic (coverage ratio), not a perfect judgment, and the audit file presents it as such.
function computeDecision(requirements, keywordCoverage) {
  const total = (requirements.must_have || []).length;
  const notCoveredCount = keywordCoverage.notCovered.length;
  if (total === 0 || notCoveredCount === 0) return "Apply";
  const coverageRatio = keywordCoverage.covered.length / total;
  if (coverageRatio >= 0.6) return "Apply";
  if (coverageRatio >= 0.3) return "Maybe Apply";
  return "Do Not Apply";
}

// Rule 61 - Pre-PDF Audit: the final gate before creating a PDF.
// Unlike the earlier fixLoop checks, which already tried to fix things, this check decides whether, after all attempts,
// a PDF may be produced at all. If not, the script stops and produces no PDF, rather than just warning.
function runPrePdfAudit({ bulletsById, summary, skillsSelection, masterData, bannedPhrases, requirements, decision, overflow }) {
  const failedChecks = [];

  if (!requirements.role_type) failedChecks.push("Missing role type");

  if (overflow && (overflow.mainOverflows || overflow.sidebarOverflows)) {
    failedChecks.push(
      "Content overflows one A4 page even after automatic shortening - would silently cut off bullets"
    );
  }

  const combined = [
    ...bulletsById,
    { id: "summary", bullets: [summary] },
    { id: "skills", bullets: [...(skillsSelection.col1 || []), ...(skillsSelection.col2 || [])] },
  ];

  const banned = checkBannedPhrases(combined, bannedPhrases);
  if (banned.length > 0) failedChecks.push(`Banned/AI-ish phrases remain: ${banned.map((v) => v.phrase).join(", ")}`);

  const globalDoNotClaim = checkBannedPhrases(combined, masterData.global_do_not_claim || []);
  if (globalDoNotClaim.length > 0)
    failedChecks.push(`Global do-not-claim phrases remain: ${globalDoNotClaim.map((v) => v.phrase).join(", ")}`);

  const hebrew = checkHebrewText(combined);
  if (hebrew.length > 0) failedChecks.push("Hebrew characters remain in English CV");

  const grounding = checkSummaryGrounding(summary, masterData);
  if (grounding.length > 0)
    failedChecks.push(`Summary claims without real project grounding: ${grounding.map((v) => v.phrase).join(", ")}`);

  const orphan = checkOrphanClaims(summary, bulletsById, masterData);
  if (orphan.length > 0)
    failedChecks.push(`Orphan claims (Summary not backed by this run's bullets): ${orphan.map((v) => v.phrase).join(", ")}`);

  const fundamentalsIssues = checkFundamentalsQualifier(summary, masterData);
  if (fundamentalsIssues.length > 0)
    failedChecks.push(
      `Fundamentals-only skills presented as full experience: ${fundamentalsIssues.map((v) => v.phrase).join(", ")}`
    );

  const skillsPoolNames = new Set(masterData.skills_pool.map((s) => s.name.toLowerCase()));
  const invalidSkills = [...(skillsSelection.col1 || []), ...(skillsSelection.col2 || [])].filter(
    (s) => !skillsPoolNames.has(String(s).toLowerCase())
  );
  if (invalidSkills.length > 0) failedChecks.push(`Skills not in verified pool: ${invalidSkills.join(", ")}`);

  // Note: Decision (Apply/Maybe Apply/Do Not Apply) is informational only in audit.md,
  // not a reason to block the PDF here - whether to apply is the user's call, not the system's. The check relies
  // on exact string matching against must_have, which can "miss" jobs with generic wording
  // (like "Frontend architecture" instead of a concrete technology name) even when there is a real match.

  return { passed: failedChecks.length === 0, failedChecks };
}

// Actually measures (rather than guesses) whether the content exceeds the height of one A4 page
async function checkOverflow(html) {
  const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const overflowInfo = await page.evaluate(() => {
    const pageEl = document.querySelector(".page");
    const pageBox = pageEl.getBoundingClientRect();
    const getLastBottom = (container) => {
      const kids = [...container.children];
      if (kids.length === 0) return container.getBoundingClientRect().bottom;
      return kids[kids.length - 1].getBoundingClientRect().bottom;
    };
    const mainBottom = getLastBottom(document.querySelector(".main"));
    const sidebarBottom = getLastBottom(document.querySelector(".sidebar"));
    return {
      pageBottom: pageBox.bottom,
      mainBottom,
      sidebarBottom,
      mainOverflows: mainBottom > pageBox.bottom + 1,
      sidebarOverflows: sidebarBottom > pageBox.bottom + 1,
    };
  });
  await browser.close();
  return overflowInfo;
}

// Step 6: inject the content into the HTML template - summary and skills are now dynamic, not fixed
// Rule 58 - standard spelling of technology names (Technology Spelling Rule)
// This is a deterministic string replacement, not an instruction to the model, so it is always 100% accurate
const TECH_SPELLING_MAP = [
  [/\btypescript\b/gi, "TypeScript"],
  [/\bjavascript\b/gi, "JavaScript"],
  [/\bnodejs\b/gi, "Node.js"],
  [/\bnode\.js\b/gi, "Node.js"],
  [/\bnextjs\b/gi, "Next.js"],
  [/\bnext\.js\b/gi, "Next.js"],
  [/\breact\.js\b/gi, "React"],
  [/\bpostgressql\b/gi, "PostgreSQL"],
  [/\bpostgres sql\b/gi, "PostgreSQL"],
  [/\bpostgresql\b/gi, "PostgreSQL"],
  [/\bpostgres\b/gi, "PostgreSQL"],
  [/\bsupabase\b/gi, "Supabase"],
  [/\brest api\b/gi, "REST API"],
  [/\brest apis\b/gi, "REST APIs"],
  [/\bclaude api\b/gi, "Claude API"],
  [/\bgithub\b/gi, "GitHub"],
  [/\bworkmanager\b/gi, "WorkManager"],
  [/\bfirebase\b/gi, "Firebase"],
  [/\bkotlin\b/gi, "Kotlin"],
  [/\bhono\b/gi, "Hono"],
  [/\bhtml\/css\b/gi, "HTML/CSS"],
  [/\bsql\b/g, "SQL"],
];

function normalizeTechSpelling(text) {
  let result = text;
  for (const [pattern, replacement] of TECH_SPELLING_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function normalizeAllTechSpelling(bulletsById, summary, skillsSelection) {
  const normalizedBullets = bulletsById.map((item) => ({
    ...item,
    bullets: item.bullets.map((b) => normalizeTechSpelling(b)),
  }));
  const normalizedSummary = normalizeTechSpelling(summary);
  const normalizedSkills = {
    col1: (skillsSelection.col1 || []).map((s) => normalizeTechSpelling(s)),
    col2: (skillsSelection.col2 || []).map((s) => normalizeTechSpelling(s)),
  };
  return { bulletsById: normalizedBullets, summary: normalizedSummary, skillsSelection: normalizedSkills };
}

// Last safety net - if the AI could not get rid of a banned phrase after all attempts (for example "flip-flopping"
// between "live currency" and "real-time currency" without finding clean wording), this deterministic removal
// guarantees the phrase does not stay in the final text. No more AI attempts, the string is removed directly.
function sanitizeBannedPhrases(text, bannedPhrases) {
  let result = text;
  for (const phrase of bannedPhrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "gi"), "");
  }
  // Clean up double spaces and dangling punctuation left after the removal
  return result
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,:;])/g, "$1")
    .replace(/:\s*\./g, ".")
    // A gerund (X-ing) left dangling with no object, right before punctuation - remove the whole phrase
    .replace(/,?\s*and\s+\w+ing([.,;])/gi, "$1")
    // A lone adjective (Comfortable, Grounded, Confident, etc.) left with nothing to describe,
    // because what followed it was deleted - only "Comfortable," remains, which reads as broken
    .replace(/\b(Comfortable|Grounded|Confident|Skilled|Solid foundation)\s*,\s*/gi, "")
    .trim();
}

function sanitizeAllBannedPhrases(bulletsById, summary, bannedPhrases) {
  const sanitizedBullets = bulletsById.map((item) => ({
    ...item,
    bullets: item.bullets.map((b) => sanitizeBannedPhrases(b, bannedPhrases)),
  }));
  const sanitizedSummary = sanitizeBannedPhrases(summary, bannedPhrases);
  return { bulletsById: sanitizedBullets, summary: sanitizedSummary };
}

// Last safety net for Orphan Claims - works exactly like the safety net for banned
// phrases. If the AI "insists" (as we actually saw with Node.js) on mentioning a technology that is not backed
// by the bullets of this run, this deterministically removes the word itself from the Summary. No more AI attempts.
function sanitizeOrphanClaims(summary, violations) {
  let result = summary;
  for (const v of violations) {
    const escaped = v.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\b${escaped}(-\\w+)?\\b,?`, "gi"), "");
  }
  return result
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,:;])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/:\s*\./g, ".")
    .trim();
}

// Rule 51 - ATS Keyword Coverage: checks for each must_have whether it has real coverage in raw_facts/tech_stack,
// so we know (and report transparently) which job keywords are really supported and which are not, instead of just hoping
// Splits a compound requirement phrase (for example "Data science fundamentals (statistics, ML concepts)")
// into checkable parts, so the whole phrase does not have to match word for word. That would be too strict
// and would lead to "not covered" even when part of the requirement is genuinely covered.
function splitRequirementIntoComponents(requirement) {
  return String(requirement)
    .replace(/[()]/g, ",")
    .split(/,|\/| and | or /i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
}

function computeKeywordCoverage(requirements, masterData) {
  const groundTruthText = masterData.projects
    .flatMap((p) => [...p.tech_stack, ...(p.data_entities || []), ...p.raw_facts])
    .concat(masterData.experience.flatMap((e) => e.raw_facts))
    .join(" ")
    .toLowerCase();

  const covered = [];
  const notCovered = [];
  for (const keyword of requirements.must_have || []) {
    const components = splitRequirementIntoComponents(keyword);
    const componentsToCheck = components.length > 0 ? components : [String(keyword)];
    const hasPartialMatch = componentsToCheck.some((c) => {
      const lower = c.toLowerCase();
      if (groundTruthText.includes(lower)) return true;
      // Basic singular/plural check - "APIs" vs "API", "databases" vs "database"
      if (lower.endsWith("s") && groundTruthText.includes(lower.slice(0, -1))) return true;
      return false;
    });
    if (hasPartialMatch) {
      covered.push(keyword);
    } else {
      notCovered.push(keyword);
    }
  }
  return { covered, notCovered };
}

function renderHtml(template, masterData, bulletsById, summary, skillsSelection, expertiseList, requirements) {
  const getBullets = (id) => {
    const match = bulletsById.find((b) => b.id === id);
    return match ? match.bullets : [];
  };

  let html = template
    .replaceAll("{{phone_raw}}", masterData.personal.phone_raw)
    .replaceAll("{{phone}}", masterData.personal.phone)
    .replaceAll("{{email}}", masterData.personal.email)
    .replaceAll("{{linkedin}}", masterData.personal.linkedin)
    .replaceAll("{{github}}", masterData.personal.github)
    .replaceAll("{{name}}", masterData.personal.name)
    .replaceAll("{{summary}}", summary)
    .replaceAll("{{education.degree}}", masterData.education.degree)
    .replaceAll("{{education.institution}}", masterData.education.institution)
    .replaceAll("{{education.coursework}}", String(masterData.education.coursework).split(", ").map((c) => c.trim().replace(/ /g, "&nbsp;")).join(", ")); // keep multi-word course names on one line

  const col1 = skillsSelection.col1 || [];
  const col2 = skillsSelection.col2 || [];
  const maxSkillRows = Math.max(col1.length, col2.length);
  let skillsRowsHtml = "";
  for (let i = 0; i < maxSkillRows; i++) {
    skillsRowsHtml += `<div>${col1[i] || ""}</div><div>${col2[i] || ""}</div>`;
  }
  const expertiseHtml = expertiseList.map((e) => `<div>${e}</div>`).join("\n");
  const languagesHtml = masterData.languages.map((l) => `<div>${l}</div>`).join("\n");

  const orderedProjects = selectProjectPair(requirements, masterData);

  const projectsHtml = orderedProjects
    .map((p) => {
      const bulletsHtml = getBullets(p.id).map((b) => `<li>${b}</li>`).join("\n");
      return `<div class="project-block">
        <div class="project-title">${p.name} | ${p.subtitle}&nbsp;(<a href="${p.link}">GitHub</a>)</div>
        <ul class="bullets">${bulletsHtml}</ul>
      </div>`;
    })
    .join("\n");

  const experienceHtml = masterData.experience
    .map((e) => {
      const bulletsHtml = getBullets(e.id).map((b) => `<li>${b}</li>`).join("\n");
      return `<div class="job-block">
        <div class="job-title">${e.name} | ${e.period}</div>
        <ul class="bullets">${bulletsHtml}</ul>
      </div>`;
    })
    .join("\n");

  html = html
    .replace("<!--SKILLS_COL1_SLOT-->", skillsRowsHtml)
    .replace("<!--SKILLS_COL2_SLOT-->", "")
    .replace("<!--EXPERTISE_SLOT-->", expertiseHtml)
    .replace("<!--LANGUAGES_SLOT-->", languagesHtml)
    .replace("<!--PROJECTS_SLOT-->", projectsHtml)
    .replace("<!--EXPERIENCE_SLOT-->", experienceHtml);

  return html;
}

// Step 7: HTML -> PDF, preserving the layout
async function htmlToPdf(html, outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({ path: outputPath, format: "A4", printBackground: true });
  await browser.close();
}

// Generic fix loop - runs a check, and if it fails sends the content for automatic fixing up to maxAttempts times
async function fixLoop({ label, checkFn, fixFn, initialValue, maxAttempts = 2 }) {
  let value = initialValue;
  let violations = checkFn(value);
  let attempts = 0;

  while (violations.length > 0 && attempts < maxAttempts) {
    attempts++;
    console.log(`  ⚠ ${label}: found ${violations.length} issues - fixing automatically (attempt ${attempts}/${maxAttempts})...`);
    violations.forEach((v) => console.log(`    - "${v.phrase || ""}" in: "${v.text}"`));
    try {
      value = await fixFn(value, violations);
    } catch (e) {
      console.log(`    (NO-API: ${e.message})`);
      break;
    }
    violations = checkFn(value);
  }

  if (violations.length > 0) {
    console.warn(`  ⚠ Warning - ${label}: ${violations.length} issues remain even after automatic fixing. Check manually:`);
    violations.forEach((v) => console.warn(`    - "${v.phrase || ""}" in: "${v.text}"`));
  } else {
    console.log(`  ✓ ${label}: OK.`);
  }
  return value;
}

// Checks whether history already has a resume created for a job with 100% identical requirements
// (same role_type + exactly the same set of must_have, ignoring order and case).
// If so, it returns the existing files instead of running the whole generation again (this also saves API cost).
function normalizeMustHave(list) {
  return [...new Set((list || []).map((s) => String(s).trim().toLowerCase()))].sort();
}

async function findCachedMatch(requirements) {
  const historyDir = path.join(__dirname, "../history");
  let files;
  try {
    files = await fs.readdir(historyDir);
  } catch {
    return null;
  }
  const jsonFiles = files.filter((f) => f.endsWith("-requirements.json"));
  const thisMustHave = normalizeMustHave(requirements.must_have);

  // If must_have is empty, do not try to find a match at all - an empty list would always "match" by mistake any other
  // job that also came out empty, even if the jobs are completely different. Better to regenerate than to return
  // a random result from the past.
  if (thisMustHave.length === 0) {
    return null;
  }

  for (const jf of jsonFiles) {
    try {
      const content = JSON.parse(await fs.readFile(path.join(historyDir, jf), "utf-8"));
      const sameRole = content.role_type === requirements.role_type;
      const sameMustHave =
        JSON.stringify(normalizeMustHave(content.must_have)) === JSON.stringify(thisMustHave);
      if (sameRole && sameMustHave && content._archived_file_base) {
        const base = content._archived_file_base;
        const pdfMatch = files.find((f) => f.endsWith(`${base}.pdf`));
        const mdMatch = files.find((f) => f.endsWith(`${base}-audit.md`));
        if (pdfMatch) {
          return {
            pdfPath: path.join(historyDir, pdfMatch),
            mdPath: mdMatch ? path.join(historyDir, mdMatch) : null,
          };
        }
      }
    } catch {
      // Corrupted or invalid requirements.json file - ignore it and keep checking the rest
    }
  }
  return null;
}

async function main() {
  // Environment variable first (safe - it does not go through shell parsing of free text, so no
  // special character in the job description (quotes, $, apostrophe) can "break" the command).
  // Falls back to a command-line argument only for backward compatibility with manual or local runs.
  await loadContent();
  const jobDescription = process.env.JOB_DESCRIPTION || CONTENT.job_description || "(see content.json requirements)";
  if (!jobDescription) {
    console.error('Usage: JOB_DESCRIPTION="..." node scripts/generate.js (or as an argument: node scripts/generate.js "<job description>")');
    process.exit(1);
  }

  const { masterData, rules, template, bannedPhrasesData } = await loadInputs();
  const bannedPhrases = computeEffectiveBannedPhrases(bannedPhrasesData, masterData);
  console.log(
    `  (${bannedPhrasesData.forbidden.length} always-banned phrases, ${bannedPhrases.length - bannedPhrasesData.forbidden.length}/${bannedPhrasesData.risky.length} "conditional" phrases blocked because no facts back them up)`
  );

  console.log("Step 1/7: extracting job requirements (role type / must-have / nice-to-have / keywords / risk)...");
  const requirements = await extractRequirements(jobDescription);
  console.log(`  Detected role type: ${requirements.role_type}`);
  console.log("  " + JSON.stringify(requirements));

  const roleTypeSlug = (requirements.role_type || "General").replace(/[/\s]+/g, "_");
  // Exact job title from the posting drives the filename; role type is only the fallback.
  const titleSlug = (requirements.job_title || "")
    .replace(/[^a-zA-Z0-9\s.+#]/g, " ")
    .replace(/\+/g, "plus").replace(/#/g, "sharp")
    .trim()
    .replace(/[\s.]+/g, "_")
    .slice(0, 50);
  const companySlug = (requirements.company || "")
    .replace(/[^a-zA-Z0-9\s.]/g, "")
    .trim()
    .replace(/[\s.]+/g, "_")
    .slice(0, 30);
  // Submitted PDF name: first name, last name and exact job title only plus "_CV" (no company).
  const fileBaseName = `${masterData.personal.name.replace(/\s+/g, "_")}_${titleSlug || roleTypeSlug + "_Developer"}_CV`;

  console.log("Checking history for a resume made for a 100% identical job (same role_type + same must_have)...");
  const cached = requirements.application_email || process.argv.includes("--no-cache") ? null : await findCachedMatch(requirements);
  if (cached) {
    console.log(`  ✓ Exact match found in history. Copying it instead of regenerating: ${cached.pdfPath}`);
    await fs.mkdir(path.join(__dirname, "../output"), { recursive: true });
    await fs.copyFile(cached.pdfPath, path.join(__dirname, "../output", `${fileBaseName}.pdf`));
    if (cached.mdPath) {
      const cachedMd = await fs.readFile(cached.mdPath, "utf-8");
      await fs.writeFile(
        path.join(__dirname, "../output", `${fileBaseName}-audit.md`),
        `${cachedMd}\n\n---\n**Note**: this file was returned from the archive (\`history/\`) because a 100% identical job (same role_type and exactly the same must_have) was already generated before. No new AI call was made.`,
        "utf-8"
      );
    }
    console.log("  ✓ Done - returned from the archive, no new content generated.");
    return;
  }
  console.log("  ✗ No exact match found - continuing with normal generation.");

  console.log("Step 2/7: writing tailored bullets for projects and experience...");
  let bullets = await rewriteBullets(masterData, rules, requirements, bannedPhrases);

  console.log("Step 3/7: quality review and fixes (AI review)...");
  bullets = await judgeBullets(rules, bullets);

  // Work experience (tutoring) is always fixed - injected here exactly as written in raw_facts, with no AI at all
  bullets = [
    ...bullets,
    ...masterData.experience.map((item) => ({
      id: item.id,
      bullets: item.raw_facts.filter((fact) => !fact.trim().startsWith("מלא כאן")),
    })),
  ];
  console.log("  ✓ Work experience (tutoring) injected unchanged - always fixed.");

  console.log("Step 4/7: writing a tailored Summary based on the bullets actually written...");
  let summary = await generateSummary(masterData, rules, requirements, bullets, bannedPhrases);

  console.log("Step 5/7: selecting and ordering Skills from the pool for this job...");
  const aiSkills = await selectSkillsWithAI(masterData, requirements);
  let skillsSelection = validateOrFallbackSkills(aiSkills, masterData, requirements);

  console.log("Step 6/7: scanning for banned phrases + Hebrew (deterministic check, not AI)...");

  bullets = await fixLoop({
    label: "Banned phrases (bullets)",
    checkFn: (v) => checkBannedPhrases(v, bannedPhrases),
    fixFn: async (v, violations) => {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 2500,
        system: `You are a resume editor. Banned cliché or AI-sounding phrases were found. Rephrase only the problematic bullets, without losing any facts. Keep the total number of bullets exactly as in the original.`,
        messages: [
          {
            role: "user",
            content: `All current bullets: ${JSON.stringify(v)}\n\nPhrases found that must not appear anymore: ${JSON.stringify([...new Set(violations.map((x) => x.phrase))])}\n\nReturn all bullets in exactly the same JSON format, with no extra text.`,
          },
        ],
      });
      return extractJson(res.content.find((b) => b.type === "text").text);
    },
    initialValue: bullets,
  });

  // Summary fix - a real loop (not a single attempt) that states exactly which phrase is banned,
  // because the regular generateSummary does not always avoid the phrase even when it gets the full rules file
  let summaryBannedAttempts = 0;
  let summaryBannedViolations = checkBannedPhrases([{ id: "summary", bullets: [summary] }], bannedPhrases);
  while (summaryBannedViolations.length > 0 && summaryBannedAttempts < 2) {
    summaryBannedAttempts++;
    const phrases = [...new Set(summaryBannedViolations.map((v) => v.phrase))];
    console.log(
      `  ⚠ Banned phrase in the Summary: "${phrases.join(", ")}" - rewriting with explicit avoidance (attempt ${summaryBannedAttempts}/2)...`
    );
    console.log("    (NO-API: no automatic Summary rewrite - fix content.json)"); break;
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: `You are a resume editor. The following Summary contains a banned phrase. Rewrite it completely, with the same structure (3 sentences, up to ${480} characters), without using any of these banned phrases: ${JSON.stringify(phrases)}. Also avoid similar wording with the same meaning.`,
      messages: [
        { role: "user", content: `Current Summary: "${summary}"\n\nRewrite it without the banned phrases. Return only the text itself, with no quotes.` },
      ],
    });
    summary = res.content.find((b) => b.type === "text").text.trim();
    summaryBannedViolations = checkBannedPhrases([{ id: "summary", bullets: [summary] }], bannedPhrases);
  }
  if (summaryBannedViolations.length > 0) {
    console.warn(
      `  ⚠ Warning: even after fixing, the Summary still contains a banned phrase: ${summaryBannedViolations.map((v) => v.phrase).join(", ")}.`
    );
  }

  let hebrewBullets = await fixLoop({
    label: "Language (Hebrew) - bullets",
    checkFn: (v) => checkHebrewText(v),
    fixFn: async (v, violations) => {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 2500,
        system: `You are a resume editor. Some bullets were written in Hebrew by mistake. Rewrite them in English, without losing any facts. Keep the total number of bullets exactly as in the original.`,
        messages: [
          {
            role: "user",
            content: `All current bullets: ${JSON.stringify(v)}\n\nThe following bullets are written in Hebrew and need to be in English: ${JSON.stringify(violations.map((x) => x.text))}\n\nReturn all bullets in exactly the same JSON format, with no extra text.`,
          },
        ],
      });
      return extractJson(res.content.find((b) => b.type === "text").text);
    },
    initialValue: bullets,
  });
  bullets = hebrewBullets;

  let summaryHebrewAttempts = 0;
  while (HEBREW_REGEX.test(summary) && summaryHebrewAttempts < 2) {
    summaryHebrewAttempts++;
    console.log(`  ⚠ Hebrew found in the Summary - rewriting (attempt ${summaryHebrewAttempts}/2)...`);
    summary = await generateSummary(masterData, rules, requirements, bullets, bannedPhrases);
  }
  if (HEBREW_REGEX.test(summary)) {
    console.warn("  ⚠ Warning: Hebrew is still present in the Summary after fixing.");
  }

  console.log("Step 6.5/7: checking the Evidence Map - the Summary must not claim a technology without real project coverage...");
  let groundingViolations = checkSummaryGrounding(summary, masterData);
  let groundingAttempts = 0;
  while (groundingViolations.length > 0 && groundingAttempts < 2) {
    groundingAttempts++;
    console.log(
      `  ⚠ The Summary mentions "${groundingViolations.map((v) => v.phrase).join(", ")}" without real coverage in any tech_stack - rewriting (attempt ${groundingAttempts}/2)...`
    );
    summary = await generateSummary(masterData, rules, requirements, bullets, bannedPhrases);
    groundingViolations = checkSummaryGrounding(summary, masterData);
  }
  if (groundingViolations.length > 0) {
    console.warn(
      `  ⚠ Warning: even after rewriting, the Summary still mentions a technology without proof: ${groundingViolations.map((v) => v.phrase).join(", ")}. Removing deterministically...`
    );
    summary = sanitizeOrphanClaims(summary, groundingViolations);
    const stillThere = checkSummaryGrounding(summary, masterData);
    if (stillThere.length === 0) {
      console.log("  ✓ Removed successfully - no unbacked claims remain.");
    } else {
      console.warn(`  ⚠ Still present after removal: ${stillThere.map((v) => v.phrase).join(", ")}`);
    }
  } else {
    console.log("  ✓ Every technology mentioned in the Summary actually exists in a real project.");
  }

  console.log("Step 6.7/7: checking Orphan Claims - every Summary claim must be backed by a bullet in this run...");
  let orphanViolations = checkOrphanClaims(summary, bullets, masterData);
  let orphanAttempts = 0;
  while (orphanViolations.length > 0 && orphanAttempts < 2) {
    orphanAttempts++;
    const phrases = [...new Set(orphanViolations.map((v) => v.phrase))];
    console.log(
      `  ⚠ The Summary mentions "${phrases.join(", ")}" but no bullet shows it in this run - rewriting the Summary (attempt ${orphanAttempts}/2)...`
    );
    summary = await generateSummary(masterData, rules, requirements, bullets, bannedPhrases);
    orphanViolations = checkOrphanClaims(summary, bullets, masterData);
  }
  if (orphanViolations.length > 0) {
    const phrases = [...new Set(orphanViolations.map((v) => v.phrase))];
    console.warn(
      `  ⚠ Warning: the Summary mentions "${phrases.join(", ")}" with no supporting bullet in this version. Removing deterministically (no more AI attempts)...`
    );
    summary = sanitizeOrphanClaims(summary, orphanViolations);
    const stillThere = checkOrphanClaims(summary, bullets, masterData);
    if (stillThere.length === 0) {
      console.log("  ✓ Removed successfully - no orphan claims remain.");
    } else {
      console.warn(`  ⚠ Still present after removal: ${stillThere.map((v) => v.phrase).join(", ")}`);
    }
  } else {
    console.log("  ✓ Every Summary claim is backed by an explicit bullet in this run.");
  }

  console.log("Step 6.75/7: checking that Fundamentals-only skills (like Python) are not presented as real experience...");
  let fundAttempts = 0;
  let fundViolations = checkFundamentalsQualifier(summary, masterData);
  while (fundViolations.length > 0 && fundAttempts < 2) {
    fundAttempts++;
    const phrases = [...new Set(fundViolations.map((v) => v.phrase))];
    console.log(
      `  ⚠ The Summary presents "${phrases.join(", ")}" as full experience, but it is only Fundamentals - rewriting (attempt ${fundAttempts}/2)...`
    );
    console.log("    (NO-API: no automatic Summary rewrite - fix content.json)"); break;
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: `You are a resume editor. The following Summary describes "${phrases.join(", ")}" as if it were full project experience, but it is really only basic knowledge (Fundamentals). Rewrite it: either remove it from the Summary entirely, or state it explicitly as "${phrases.map((p) => p + " Fundamentals").join(", ")}" and not as a full experience level. Keep the same structure (3 sentences, up to 480 characters).`,
      messages: [
        { role: "user", content: `Current Summary: "${summary}"\n\nRewrite it. Return only the text itself, with no quotes.` },
      ],
    });
    summary = res.content.find((b) => b.type === "text").text.trim();
    fundViolations = checkFundamentalsQualifier(summary, masterData);
  }
  if (fundViolations.length > 0) {
    console.warn(
      `  ⚠ Warning: the Summary still presents "${fundViolations.map((v) => v.phrase).join(", ")}" without the Fundamentals qualifier.`
    );
  } else {
    console.log("  ✓ No inflated claims about Fundamentals-only Skills.");
  }

  console.log("Step 6.8/7: checking that the Summary does not exceed about 5 lines...");
  let lengthAttempts = 0;
  while (checkSummaryLength(summary) && lengthAttempts < 2) {
    lengthAttempts++;
    console.log(
      `  ⚠ The Summary is too long (${summary.length} characters) - rewriting it shorter (attempt ${lengthAttempts}/2)...`
    );
    summary = await generateSummary(masterData, rules, requirements, bullets, bannedPhrases);
  }
  if (checkSummaryLength(summary)) {
    console.warn(`  ⚠ Warning: the Summary is still long (${summary.length} characters) even after shortening. Check manually.`);
  } else {
    console.log(`  ✓ Summary length OK (${summary.length} characters).`);
  }

  console.log("Normalizing technology spelling to the standard form (TypeScript, PostgreSQL, GitHub, etc.)...");
  ({ bulletsById: bullets, summary, skillsSelection } = normalizeAllTechSpelling(
    bullets,
    summary,
    skillsSelection
  ));

  const roleTarget = masterData.role_targets && masterData.role_targets[requirements.role_type];
  const expertiseList = (roleTarget && roleTarget.expertise) || masterData.expertise;
  console.log(`Selected Expertise (by role_type): ${expertiseList.join(", ")}`);

  console.log("Step 7/7: checking that the layout did not break (A4 page overflow)...");
  let html = renderHtml(template, masterData, bullets, summary, skillsSelection, expertiseList, requirements);
  let overflow = await checkOverflow(html);

  // NO-API: A4 overflow is a HARD FAIL (no AI shortening, no silent bullet dropping)
  if (overflow.mainOverflows || overflow.sidebarOverflows) {
    await fs.mkdir(path.join(__dirname, "../output"), { recursive: true });
    await fs.writeFile(
      path.join(__dirname, "../output", `${fileBaseName}-AUDIT-FAILED.md`),
      `# Audit failed - no PDF created - ${new Date().toLocaleString("he-IL")}\n\n## Failed checks\n- Content overflows one A4 page (${JSON.stringify(overflow)}). Shorten bullets/summary in content.json and re-run.\n`,
      "utf-8"
    );
    throw new Error(`PDF generation blocked: A4 overflow ${JSON.stringify(overflow)}`);
  }
  let attempts = 3;
  while ((overflow.mainOverflows || overflow.sidebarOverflows) && attempts < 3) {
    attempts++;
    console.log(`  ⚠ Content overflows the page - shortening automatically (attempt ${attempts}/2)...`);
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system: `You are a resume editor. The content is taller than one A4 page. Shorten each bullet by 15-20% without losing key facts. Keep exactly the same number of bullets.`,
      messages: [
        { role: "user", content: `Shorten the following bullets: ${JSON.stringify(bullets)}. Return JSON only.` },
      ],
    });
    bullets = extractJson(res.content.find((b) => b.type === "text").text);
    html = renderHtml(template, masterData, bullets, summary, skillsSelection, expertiseList, requirements);
    overflow = await checkOverflow(html);
  }

  let dropAttempts = Infinity;
  while ((overflow.mainOverflows || overflow.sidebarOverflows) && dropAttempts < bullets.length * 2) {
    // Finds the project with the most bullets right now (the most likely to have "extra"), and removes just one bullet from it
    const target = bullets.reduce((max, item) => (item.bullets.length > max.bullets.length ? item : max));
    if (target.bullets.length <= 2) break; // never go below 2 bullets per project, that would be too thin
    console.warn(
      `  ⚠ Still overflowing after AI shortening - removing just one bullet from "${target.id}" (${target.bullets.length}→${target.bullets.length - 1}), checking again...`
    );
    bullets = bullets.map((item) =>
      item.id === target.id ? { ...item, bullets: item.bullets.slice(0, -1) } : item
    );
    html = renderHtml(template, masterData, bullets, summary, skillsSelection, expertiseList, requirements);
    overflow = await checkOverflow(html);
    dropAttempts++;
  }

  if (overflow.mainOverflows || overflow.sidebarOverflows) {
    console.warn("  ⚠ Warning: even after shortening and trimming, the content still overflows one page. Check manually before sending.");
  } else {
    console.log("  ✓ The content fits exactly on one A4 page, layout preserved.");
  }

  // Last safety net - after everything, including the automatic shortening in step 7 (which is also AI and can
  // accidentally "introduce" a new banned phrase). This is the last real check before the final Audit.
  console.log("Last safety net - deterministically removing any banned phrase left after all attempts (including shortening)...");
  const preSanitizeCombined = [...bullets, { id: "summary", bullets: [summary] }];
  const remainingBefore = checkBannedPhrases(preSanitizeCombined, bannedPhrases);
  if (remainingBefore.length > 0) {
    console.log(`  ⚠ ${remainingBefore.length} phrases remain after all AI attempts (including page shortening) - removing directly: ${remainingBefore.map((v) => v.phrase).join(", ")}`);
    ({ bulletsById: bullets, summary } = sanitizeAllBannedPhrases(bullets, summary, bannedPhrases));
    console.log("  ✓ Removed deterministically (no more AI attempts - guaranteed).");
    // Re-render so the final HTML/PDF reflects the cleaned text, not the version with the banned phrase
    html = renderHtml(template, masterData, bullets, summary, skillsSelection, expertiseList, requirements);
  }

  const keywordCoverage = computeKeywordCoverage(requirements, masterData);
  const decision = computeDecision(requirements, keywordCoverage);
  console.log(`Job fit assessment: ${decision}`);

  console.log("Running the Pre-PDF Audit - the final gate before creating the PDF...");
  const audit = runPrePdfAudit({
    bulletsById: bullets,
    summary,
    skillsSelection,
    masterData,
    bannedPhrases,
    requirements,
    decision,
    overflow,
  });

  const timestamp = Date.now();

  // owner rule: required phrases (e.g. "Claude Code") must appear in every CV.
  {
    const _md = JSON.parse(await fs.readFile(path.join(__dirname, "../data/master-data.json"), "utf-8")); const req = (_md.base_text && _md.base_text.required_everywhere) || [];
    const allText = JSON.stringify({ s: summary, b: bullets });
    req.forEach((ph) => { if (!allText.includes(ph)) { audit.passed = false; (audit.failedChecks = audit.failedChecks || []).push(`Required phrase missing: "${ph}"`); } });
  }

  if (!audit.passed) {
    console.error("  ✗ The Audit failed - no PDF will be created. Failed checks:");
    audit.failedChecks.forEach((c) => console.error(`    - ${c}`));
    const failLines = [
      `# Audit failed - no PDF created - ${new Date(timestamp).toLocaleString("he-IL")}`,
      "",
      "## Failed checks",
      ...audit.failedChecks.map((c) => `- ${c}`),
      "",
      "Fix these issues manually, or run again (there is some randomness involved), before a PDF can be produced.",
    ];
    await fs.mkdir(path.join(__dirname, "../output"), { recursive: true });
    await fs.writeFile(
      path.join(__dirname, "../output", `${fileBaseName}-AUDIT-FAILED.md`),
      failLines.join("\n"),
      "utf-8"
    );
    throw new Error(`PDF generation blocked. Failed checks: ${audit.failedChecks.join("; ")}`);
  }
  console.log("  ✓ All Audit checks passed.");

  // owner rule: flag any bullet/summary that differs from the approved base text for his approval.
  {
    const _md2 = JSON.parse(await fs.readFile(path.join(__dirname, "../data/master-data.json"), "utf-8"));
    const roles = (_md2.base_text && _md2.base_text.by_role) || {};
    const baseSet = new Set();
    Object.values(roles).forEach((r) => Object.values(r.projects || {}).forEach((arr) => arr.forEach((b) => baseSet.add(b.trim()))));
    const projIds = new Set(_md2.projects.map((p) => p.id));
    const changed = [];
    bullets.filter((g) => projIds.has(g.id)).forEach((g) => g.bullets.forEach((b) => { if (!baseSet.has(b.trim())) changed.push(`[${g.id}] ${b}`); }));
    const roleBase = roles[requirements?.role_type];
    const _norm = (t) => String(t).trim().replace(/^(Full Stack|Backend|Frontend|AI|Python|Android|Software) developer/, "X developer");
    const sumChanged = roleBase && _norm(roleBase.summary) !== _norm(summary);
    if (changed.length || sumChanged) {
      const lines = ["# Owner approval needed: text that differs from the approved base", ""];
      if (sumChanged) lines.push("## Summary", "Base: " + roleBase.summary, "New: " + summary, "");
      if (changed.length) lines.push("## Changed bullets", ...changed.map((c) => "- " + c));
      await fs.mkdir(path.join(__dirname, "../output"), { recursive: true });
      await fs.writeFile(path.join(__dirname, "../output", `${fileBaseName}-NEEDS-OWNER-APPROVAL.md`), lines.join("\n"), "utf-8");
      console.log(`  ⚠ ${changed.length} bullets${sumChanged ? " + Summary" : ""} differ from the base - owner approval needed before applying (NEEDS-OWNER-APPROVAL.md).`);
    } else {
      console.log("  ✓ All text matches the approved base - no further approval needed.");
    }
  }

  // Rule 63 (enforced, owner rule): no PDF unless the decision is exactly "Apply".
  if (decision !== "Apply") {
    const outDir = path.join(__dirname, "../output");
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(
      path.join(outDir, `${fileBaseName}-requirements.json`),
      JSON.stringify({ ...requirements, _archived_file_base: null, _decision: decision }, null, 2),
      "utf-8"
    );
    const lines = [
      `# Decision blocked - no PDF created - ${new Date(timestamp).toLocaleString("he-IL")}`,
      "",
      `## Decision`,
      decision,
      "",
      `## Why (rule 63: no PDF unless the decision is Apply)`,
      keywordCoverage.notCovered.length > 0
        ? `must_have not covered in the CV: ${keywordCoverage.notCovered.join(", ")}`
        : "The decision is not Apply according to computeDecision.",
      keywordCoverage.covered.length > 0 ? `must_have covered: ${keywordCoverage.covered.join(", ")}` : "must_have covered: -",
      "",
      `## risk_gap`,
      (requirements.risk_gap || []).join(", ") || "-",
      "",
      `## Summary checked`,
      summary,
      "",
      "The Pre-PDF Audit passed; the block is only because of the Decision. To change it: add a real fact to master-data (raw_facts) that proves the must_have, or do not apply.",
    ];
    await fs.writeFile(path.join(outDir, `${fileBaseName}-DECISION-BLOCKED.md`), lines.join("\n"), "utf-8");
    throw new Error(`PDF generation blocked by rule 63: decision is "${decision}" (not Apply)`);
  }
  console.log("  ✓ Decision = Apply - exporting PDF.");

  console.log("Exporting PDF...");
  const outPath = path.join(__dirname, "../output", `${fileBaseName}.pdf`);
  await htmlToPdf(html, outPath);

  // Saves the extracted requirements next to the PDF, so future runs can compare and find
  // an exact match (same role_type + same must_have) and return this file instead of regenerating
  await fs.writeFile(
    path.join(__dirname, "../output", `${fileBaseName}-requirements.json`),
    JSON.stringify({ ...requirements, _archived_file_base: fileBaseName }, null, 2),
    "utf-8"
  );

  if (requirements.application_email) {
    console.log(`The job asks for an email application (${requirements.application_email}) - drafting an email in Hebrew and English...`);
    const emailDraft = await generateEmailDraft(masterData, requirements, bannedPhrases, keywordCoverage);
    await fs.writeFile(
      path.join(__dirname, "../output", `${fileBaseName}-email-draft.json`),
      JSON.stringify({ to: requirements.application_email, ...emailDraft }, null, 2),
      "utf-8"
    );
    console.log("  ✓ Email draft written (both languages).");
  }

  // Short Audit file next to the PDF (rule 62) - not part of the CV, it is for you only, so you know everything is safe to submit
  const rationaleLines = [
    `# Audit - ${new Date(timestamp).toLocaleString("he-IL")}`,
    "",
    `## Decision`,
    decision,
    "",
    `## Role Type`,
    requirements.role_type || "Not detected",
    "",
    `## Email application`,
    requirements.application_email
      ? `Address detected: ${requirements.application_email} (a Gmail draft was created if the connection is configured)`
      : "No application email detected - probably applying through a portal or website",
    "",
    `## CV Angle`,
    (masterData.role_targets && masterData.role_targets[requirements.role_type]
      ? `Primary project: ${masterData.role_targets[requirements.role_type].primary_project}`
      : "No specific role_target defined for this role"),
    "",
    `## What was emphasized (must_have)`,
    (requirements.must_have || []).join(", ") || "-",
    "",
    `## Extra advantage (nice_to_have)`,
    (requirements.nice_to_have || []).join(", ") || "-",
    "",
    `## What was not claimed / risks identified (risk_gap)`,
    (requirements.risk_gap || []).join(", ") || "-",
    "",
    `## Keyword coverage (ATS) - must_have`,
    keywordCoverage.covered.length > 0
      ? `✓ Actually covered: ${keywordCoverage.covered.join(", ")}`
      : "✓ Actually covered: -",
    keywordCoverage.notCovered.length > 0
      ? `✗ Not covered (not claimed in the CV): ${keywordCoverage.notCovered.join(", ")}`
      : "✗ Not covered: -",
    "",
    `## Not Claimed (on purpose, per role_targets + global_do_not_claim)`,
    [
      ...((masterData.role_targets && masterData.role_targets[requirements.role_type]?.do_not_claim) || []),
      ...(masterData.global_do_not_claim || []),
    ].join(", "),
    "",
    `## Selected Expertise (by role_type)`,
    expertiseList.join(", "),
    "",
    `## Selected Skills`,
    [...(skillsSelection.col1 || []), ...(skillsSelection.col2 || [])].join(", "),
    "",
    `## Final Summary`,
    summary,
    "",
    `## Quality check results (all passed, otherwise no PDF would have been created)`,
    overflow.mainOverflows || overflow.sidebarOverflows
      ? "⚠ The content overflowed one A4 page even after automatic shortening - check manually (this is only a warning, not a block)."
      : "✓ Fits on one A4 page.",
    "✓ Summary grounding: passed",
    "✓ Orphan claims: passed",
    "✓ Banned/AI-ish phrases: passed",
    "✓ Global do-not-claim: passed",
    "✓ Hebrew check: passed",
    "✓ Skills pool validity: passed",
  ];
  const rationalePath = path.join(__dirname, "../output", `${fileBaseName}-audit.md`);
  await fs.writeFile(rationalePath, rationaleLines.join("\n"), "utf-8");

  console.log(`PDF ready: ${outPath}`);
  console.log(`Audit file: ${rationalePath}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
