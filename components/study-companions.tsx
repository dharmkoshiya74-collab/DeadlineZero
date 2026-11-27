"use client";

import { useState } from "react";

const companions = [
  {
    id: "morrow",
    name: "Morrow",
    kind: "The firefly",
    greeting: "One clear next step is enough. What would you like to tackle?",
  },
  {
    id: "orbit",
    name: "Orbit",
    kind: "The little planet",
    greeting: "Let's make a little room for focus, one block at a time.",
  },
  {
    id: "pebble",
    name: "Pebble",
    kind: "The curious sprout",
    greeting: "No rush. Pick a plan and we can look at it together.",
  },
] as const;

type CompanionId = (typeof companions)[number]["id"];

function CompanionIllustration({
  id,
  large = false,
}: {
  id: CompanionId;
  large?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      className={`companion-illustration companion-${id}${large ? " is-large" : ""}`}
      focusable="false"
      viewBox="0 0 120 120"
    >
      <ellipse cx="60" cy="106" rx="28" ry="5" className="companion-shadow" />
      {id === "morrow" && (
        <>
          <path d="M37 54C19 42 17 61 34 72M83 54c18-12 20 7 3 18" className="morrow-wings" />
          <path d="M47 36 42 22M73 36l5-14" className="morrow-antenna" />
          <circle cx="41" cy="19" r="4" className="morrow-glow" />
          <circle cx="79" cy="19" r="4" className="morrow-glow" />
          <ellipse cx="60" cy="68" rx="25" ry="31" className="morrow-body" />
          <path d="M45 95 39 102M75 95l6 7" className="morrow-limbs" />
          <ellipse cx="52" cy="66" rx="3" ry="4" className="companion-eye" />
          <ellipse cx="68" cy="66" rx="3" ry="4" className="companion-eye" />
          <path d="M55 77q5 5 10 0" className="companion-smile" />
          <circle cx="43" cy="75" r="4" className="morrow-cheek" />
          <circle cx="77" cy="75" r="4" className="morrow-cheek" />
        </>
      )}
      {id === "orbit" && (
        <>
          <ellipse cx="60" cy="65" rx="45" ry="17" className="orbit-ring" />
          <circle cx="60" cy="63" r="29" className="orbit-body" />
          <path d="M83 45a29 29 0 0 1 4 34" className="orbit-highlight" />
          <ellipse cx="51" cy="62" rx="3" ry="4" className="companion-eye" />
          <ellipse cx="68" cy="62" rx="3" ry="4" className="companion-eye" />
          <path d="M55 74q5 5 10 0" className="companion-smile" />
          <path d="m36 40-3-7M84 88l4 5" className="orbit-sparkle" />
          <circle cx="30" cy="33" r="3" className="orbit-sparkle-dot" />
        </>
      )}
      {id === "pebble" && (
        <>
          <path d="M58 48c-2-12 6-20 17-22-1 11-6 18-17 22Z" className="pebble-leaf" />
          <path d="M58 48c-8-10-17-10-24-5 7 8 15 10 24 5Z" className="pebble-leaf-light" />
          <path d="M28 88c0-10 5-18 13-21 2-17 15-27 31-23 13 3 21 14 20 27 7 5 10 12 8 21-2 10-10 16-22 16H48c-12 0-20-8-20-20Z" className="pebble-body" />
          <ellipse cx="49" cy="78" rx="3" ry="4" className="companion-eye" />
          <ellipse cx="70" cy="78" rx="3" ry="4" className="companion-eye" />
          <path d="M54 89q5 5 10 0" className="companion-smile" />
          <circle cx="40" cy="86" r="4" className="pebble-cheek" />
          <circle cx="79" cy="86" r="4" className="pebble-cheek" />
          <path d="M46 105v3M73 105v3" className="pebble-feet" />
        </>
      )}
    </svg>
  );
}

export function StudyCompanionPicker() {
  const [selectedId, setSelectedId] = useState<CompanionId>("morrow");
  const selected = companions.find((companion) => companion.id === selectedId) ?? companions[0];

  return (
    <section aria-label="Choose a study companion" className="companion-picker">
      <div className="companion-picker-heading">
        <div>
          <p className="eyebrow">YOUR STUDY COMPANIONS</p>
          <h2>Pick a study buddy</h2>
          <p>Choose a character for this visit. Your assistant still uses your saved study context.</p>
        </div>
        <div aria-live="polite" className="companion-greeting">
          <CompanionIllustration id={selected.id} large />
          <div>
            <strong>{selected.name} says</strong>
            <p>{selected.greeting}</p>
          </div>
        </div>
      </div>

      <div aria-label="Study companion" className="companion-choice-grid" role="group">
        {companions.map((companion) => (
          <button
            aria-pressed={selectedId === companion.id}
            className={`companion-choice${selectedId === companion.id ? " is-selected" : ""}`}
            key={companion.id}
            onClick={() => setSelectedId(companion.id)}
            type="button"
          >
            <CompanionIllustration id={companion.id} />
            <span>
              <strong>{companion.name}</strong>
              <small>{companion.kind}</small>
            </span>
            <span aria-hidden="true" className="companion-choice-check">✓</span>
          </button>
        ))}
      </div>
    </section>
  );
}
