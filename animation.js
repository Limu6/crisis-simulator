// animation.js
export async function playCrisisAnimation(crisis, outcomeTag) {
    const anim = document.getElementById("crisisAnimation");
    const crisisText = document.getElementById("crisisText");

    if (!anim || !crisisText) {
        console.error("Animation elements missing in DOM");
        return;
    }

    crisisText.classList.add("hidden");
    anim.classList.remove("hidden");
    anim.classList.add("active");

    const beats = {
        economic: {
            positive: [
                "Markets stabilizing…",
                "Bond yields recovering…",
                "Investor confidence rising…"
            ],
            neutral: [
                "Markets reacting…",
                "Analysts reassessing positions…",
                "Volatility indicators shifting…"
            ],
            negative: [
                "Indices falling sharply…",
                "Currency pressure increasing…",
                "Liquidity stress detected…"
            ]
        },
        military: {
            positive: [
                "Troop lines holding…",
                "Enemy movement slowing…",
                "Allied coordination improving…"
            ],
            neutral: [
                "Forces repositioning…",
                "Reconnaissance updating…",
                "Command awaiting new intel…"
            ],
            negative: [
                "Hostile advance detected…",
                "Defensive lines weakening…",
                "Casualty reports incoming…"
            ]
        },
        cyber: {
            positive: [
                "Firewall integrity restored…",
                "Intrusion attempts declining…",
                "Network stability improving…"
            ],
            neutral: [
                "Traffic patterns shifting…",
                "Security teams analyzing logs…",
                "Threat vectors recalibrating…"
            ],
            negative: [
                "System breaches escalating…",
                "Critical nodes compromised…",
                "Malware propagation detected…"
            ]
        },
        political: {
            positive: [
                "Public sentiment improving…",
                "Media tone stabilizing…",
                "Diplomatic channels opening…"
            ],
            neutral: [
                "Opinion polls shifting…",
                "Stakeholders reassessing positions…",
                "Narratives evolving…"
            ],
            negative: [
                "Public unrest rising…",
                "Opposition pressure increasing…",
                "International criticism mounting…"
            ]
        }
    };

    const list = beats[crisis.type]?.[outcomeTag] || ["Situation evolving…"];
    const beatCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < beatCount; i++) {
        anim.innerText = list[Math.floor(Math.random() * list.length)];
        anim.classList.add("animation-beat");
        await wait(600);
        anim.classList.remove("animation-beat");
    }

    anim.classList.remove("active");
    await wait(400);

    anim.classList.add("hidden");
    crisisText.classList.remove("hidden");
}

function wait(ms) {
    return new Promise(res => setTimeout(res, ms));
}