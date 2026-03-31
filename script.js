import { playCrisisAnimation } from "./animation.js";
// ------------------------------------------------------
// GLOBAL CONFIG
// ------------------------------------------------------
const GROQ_API_KEY = "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";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// ------------------------------------------------------
// WORLD STATE (applies only at end of crisis)
// ------------------------------------------------------
const worldState = {
    stability: 60,
    polarization: 40,
    elitePressure: 30,
    informationLevel: 55,
    borderTension: 35,
    diplomaticGoodwill: 50,
    bureaucraticLoyalty: 60,
    mediaTone: 40
};

// ------------------------------------------------------
// CRISIS TYPES
// ------------------------------------------------------
const CRISIS_TYPES = [
    "political",
    "economic",
    "military",
    "cyber",
    "civil_unrest",
    "foreign_pressure"
];

let previousCrisisType = null;

// ------------------------------------------------------
// CRISIS CREATION
// ------------------------------------------------------
function createCrisis(type) {
    return {
        type,
        stability: 0,
        status: "ongoing",
        turnCount: 0,

        crisisPhase: "New Crisis Report",

        narrativeHistory: [],
        decisionHistory: [],
        outcomeHistory: [],
        impactHistory: [],
        statusHistory: [],

        text: "Loading crisis..."
    };
}

function getNextCrisisType() {
    const options = CRISIS_TYPES.filter(t => t !== previousCrisisType);
    return options[Math.floor(Math.random() * options.length)];
}

// ------------------------------------------------------
// AI: CRISIS INTRO
// ------------------------------------------------------
async function generateCrisisIntro(type) {
    const prompt = `
Write a clear, tense, briefing-style introduction for a national-level crisis of type "${type}".
Use 3–4 short sentences.
Each sentence must describe one concrete development.
Tone: political thriller, but easy to read.
`;

    return await callAI(prompt);
}

async function generateDecisionExplanations(crisis) {

    const prompt = `
Return ONLY valid JSON.

You are explaining four possible decisions in a crisis simulation.
Each option must present both a plausible benefit AND a plausible risk.

Crisis type: ${crisis.type}
Current stability: ${crisis.stability}
Crisis description: ${crisis.text}

Rules:
- Do NOT reveal which option is best.
- Each explanation must include one potential advantage AND one potential risk.
- Keep the tone analytical and balanced.
- No probabilities, numbers, or internal mechanics.

JSON ONLY:
{
  "aggressive": "",
  "diplomatic": "",
  "investigative": "",
  "delay": ""
}
`;

    const raw = await callAI(prompt);
    const parsed = extractJSON(raw);

    const fallback = {
        aggressive: "A decisive move that could restore control quickly but risks provoking stronger resistance.",
        diplomatic: "Dialogue may ease tensions but could be interpreted as hesitation, encouraging further pressure.",
        investigative: "A deeper inquiry could reveal critical information but may slow the immediate response.",
        delay: "Waiting might prevent rash escalation but risks letting the situation worsen unchecked."
    };

    if (
        parsed &&
        typeof parsed.aggressive === "string" &&
        typeof parsed.diplomatic === "string" &&
        typeof parsed.investigative === "string" &&
        typeof parsed.delay === "string"
    ) {
        return parsed;
    }

    return fallback;
}

// ------------------------------------------------------
// AI: DECISION OUTCOME
// ------------------------------------------------------
async function generateDecisionOutcome(decision, crisis) {
    const prompt = `
Return ONLY valid JSON.
Do NOT include backticks.
Do NOT include code fences.

You are the crisis engine for a national-level political simulator.

Crisis type: ${crisis.type}
Current stability: ${crisis.stability}
Crisis description: ${crisis.text}
Decision chosen: ${decision}

JSON format:
{
  "outcome": "2-3 sentence narrative result.",
  "impact": 0.0,
  "status": "ongoing",
  "tag": "neutral"
}
`;

    const raw = await callAI(prompt);

    let cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    try {
        const parsed = JSON.parse(cleaned);
        return parsed;
    } catch (err) {
        console.error("Outcome JSON parse error:", err, raw);
        return {
            outcome: "Unexpected developments occur, but the situation remains unclear.",
            impact: 0,
            status: "ongoing",
            tag: "neutral"
        };
    }
}

// ------------------------------------------------------
// AI: FINAL SUMMARY (whole-path, 5–6 sentences)
// ------------------------------------------------------
async function generateFinalSummary(crisis) {
    const prompt = `
Write a 5–6 sentence final summary of the entire crisis.

Include:
- how the crisis began
- how early decisions shaped momentum
- key turning points
- how stability shifted
- why the crisis ended when it did
- long-term consequences

Tone: clear, briefing-style, political thriller.

Crisis history:
Intro: "${crisis.narrativeHistory[0]}"
Decisions: ${JSON.stringify(crisis.decisionHistory)}
Outcomes: ${JSON.stringify(crisis.outcomeHistory)}
Impacts: ${JSON.stringify(crisis.impactHistory)}
Statuses: ${JSON.stringify(crisis.statusHistory)}
`;

    return await callAI(prompt);
}

// ------------------------------------------------------
// FINAL WORLD STATE EFFECTS (Option A)
// ------------------------------------------------------
// (Reinsert your worldState object above this, unchanged)
function applyFinalWorldStateEffects(crisis) {
    const finalStability = crisis.stability;

    if (finalStability >= 2) {
        worldState.stability += rand(5, 12);
        worldState.polarization -= rand(3, 8);
        worldState.diplomaticGoodwill += rand(4, 10);
    } else if (finalStability <= -2) {
        worldState.stability -= rand(5, 12);
        worldState.polarization += rand(4, 10);
        worldState.borderTension += rand(3, 8);
    } else {
        worldState.stability += rand(1, 4);
        worldState.polarization -= rand(1, 3);
    }

    for (let key in worldState) {
        worldState[key] = clamp(worldState[key], 0, 100);
    }
}

async function generateAdvisorPrompt(crisis) {
    const prompt = `
Return ONLY valid JSON.

You are generating a short advisory prompt for a national crisis simulation.

Current situation:
${JSON.stringify(crisis.text)}

Crisis type: ${crisis.type}
Turn: ${crisis.turnCount}
Status: ${crisis.status}

Write ONE sentence (8–16 words) that:
- feels urgent and decision‑driven
- frames the player as the authority
- implies advisors are presenting options
- fits the current phase of the crisis
- avoids repetition and clichés
- uses a political‑thriller tone

Examples of style (do NOT reuse):
- "Your advisors outline four possible responses. The next move is yours."
- "The room waits for your direction as the situation shifts."
- "Analysts present four strategic paths. You must choose the course."

JSON:
{
  "prompt": ""
}
`;

    const raw = await callAI(prompt);
    const parsed = extractJSON(raw);
    return parsed?.prompt || "Your advisors present four options. What will you authorize?";
}

// ------------------------------------------------------
// GAME LOOP
// ------------------------------------------------------
let currentCrisis = null;

async function startNewCrisis(type = getNextCrisisType()) {
    previousCrisisType = type;

    currentCrisis = createCrisis(type);

    // Hide grid while loading
    document.getElementById("decisionGrid").classList.add("hidden");

    // Reset button
    const btn = document.getElementById("continueBtn");
    btn.innerText = "Start";
    btn.classList.add("hidden");

    // Clear old explanations
    clearExplanations();

    // Generate intro
    const intro = await generateCrisisIntro(type);
    currentCrisis.text = intro;
    currentCrisis.narrativeHistory.push(intro);
    currentCrisis.crisisPhase = "New Crisis Report";

    // Render crisis intro
    renderCrisis(currentCrisis);

    const advisorLine = await generateAdvisorPrompt(currentCrisis);
document.getElementById("advisorPrompt").innerText = advisorLine;

    // Generate explanations for the intro state
    const explanations = await generateDecisionExplanations(currentCrisis);
    updateDecisionExplanations(explanations);

    // Show grid
    document.getElementById("decisionGrid").classList.remove("hidden");
}

window.handleDecision = async function (decision) {
    // 1. Generate outcome from AI
    const result = await generateDecisionOutcome(decision, currentCrisis);

    // 2. Map outcome tag → animation direction
    const tagMap = {
        very_positive: "positive",
        positive: "positive",
        neutral: "neutral",
        negative: "negative",
        very_negative: "negative"
    };

    // 3. Play animation BEFORE showing outcome
    await playCrisisAnimation(currentCrisis, tagMap[result.tag]);

    // 4. Apply outcome to crisis state
    currentCrisis.turnCount++;
    currentCrisis.decisionHistory.push(decision);
    currentCrisis.outcomeHistory.push(result.outcome);
    currentCrisis.impactHistory.push(result.impact);
    currentCrisis.statusHistory.push(result.status);

    currentCrisis.status = result.status;
    currentCrisis.narrativeHistory.push(result.outcome);

    currentCrisis.stability += result.impact;
    currentCrisis.stability = Math.round(currentCrisis.stability * 10) / 10;

    // 5. Update crisis text and phase
    currentCrisis.text = result.outcome;
    currentCrisis.crisisPhase = "Situation Evolving";

    // 6. Render updated crisis
    renderCrisis(currentCrisis);

    // 7. Check if crisis ends
    const crisisEnded =
        result.status === "resolved" ||
        currentCrisis.stability >= 3 ||
        currentCrisis.stability <= -3;

    if (crisisEnded) {
        applyFinalWorldStateEffects(currentCrisis);

        const summary = await generateFinalSummary(currentCrisis);
        currentCrisis.text = summary;
        currentCrisis.crisisPhase = "Final Report";

        renderCrisis(currentCrisis);

        const btn = document.getElementById("continueBtn");
        btn.innerText = "Continue";
        btn.classList.remove("hidden");

        document.getElementById("advisorPrompt").innerText =
            "Final assessment prepared. Review the report.";

        document.getElementById("decisionGrid").classList.add("hidden");
        return;
    }

    // 8. Crisis continues → new advisor line
    const advisorLine = await generateAdvisorPrompt(currentCrisis);
    document.getElementById("advisorPrompt").innerText = advisorLine;

    // 9. Regenerate explanations for next turn
    const explanations = await generateDecisionExplanations(currentCrisis);
    updateDecisionExplanations(explanations);

    // 10. Show decision grid again
    document.getElementById("decisionGrid").classList.remove("hidden");
}

window.continueAfterSummary = function () {
    startNewCrisis();
};

// -----------------------------------------F-------------
// UI HELPERS
// ------------------------------------------------------
function renderCrisis(crisis) {
    document.getElementById("crisisPhase").innerText = crisis.crisisPhase;
    document.getElementById("crisisText").innerText = crisis.text;
    updateStabilityBar(crisis.stability);
}

function clearExplanations() {
    document.getElementById("exp-aggressive").innerText = "";
    document.getElementById("exp-diplomatic").innerText = "";
    document.getElementById("exp-investigative").innerText = "";
    document.getElementById("exp-delay").innerText = "";
}

function updateDecisionExplanations(ex) {
    document.getElementById("exp-aggressive").innerText = ex.aggressive;
    document.getElementById("exp-diplomatic").innerText = ex.diplomatic;
    document.getElementById("exp-investigative").innerText = ex.investigative;
    document.getElementById("exp-delay").innerText = ex.delay;
}

// ------------------------------------------------------
// CENTERED, SYMMETRIC, SMOOTH STABILITY BAR
// ------------------------------------------------------
function updateStabilityBar(stability) {
    const bar = document.getElementById("stabilityBar");

    const pct = ((stability + 3) / 6) * 100;
    bar.style.width = pct + "%";

    if (stability >= 1) {
        bar.style.background = "linear-gradient(to right, #d6ffe6, #b3ffd1)";
    } else if (stability <= -1) {
        bar.style.background = "linear-gradient(to right, #ffd6d6, #ffb3b3)";
    } else {
        bar.style.background = "linear-gradient(to right, #fff1cc, #ffe6a3)";
    }
}

// ------------------------------------------------------
// HELPERS
// ------------------------------------------------------
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
}

const impactRanges = {
    very_positive: { min: 0.5, max: 2.0 },
    positive:      { min: 0.1, max: 1.0 },
    negative:      { min: -1.0, max: -0.1 },
    very_negative: { min: -2.0, max: -0.5 }
};

function pickImpactFromRange(tag) {
    const r = impactRanges[tag];
    if (!r) return 0; // fallback
    const value = r.min + Math.random() * (r.max - r.min);
    return Math.round(value * 10) / 10;
}

function extractJSON(text) {
    if (!text) return null;

    // Remove code fences and backticks
    text = text.replace(/```[\s\S]*?```/g, match => match.replace(/```/g, ""));
    text = text.replace(/```/g, "");

    // Replace smart quotes
    text = text.replace(/[“”]/g, '"');

    // Remove leading commentary like "Here is the JSON:"
    text = text.replace(/^[^\{]*/, "");

    // Find the first JSON object
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    let json = match[0];

    // Fix missing commas between fields (common Llama issue)
    json = json.replace(/"\s*([a-zA-Z0-9_]+)"\s*:/g, '"$1":');

    try {
        return JSON.parse(json);
    } catch (err) {
        console.warn("JSON parse failed:", err, json);
        return null;
    }
}

// ------------------------------------------------------
// GENERIC AI CALL
// ------------------------------------------------------
async function callAI(prompt) {
    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + GROQ_API_KEY
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.6
        })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
}