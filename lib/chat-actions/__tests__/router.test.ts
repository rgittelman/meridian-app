/**
 * Chat Intent Router — unit-style test cases.
 *
 * Run: npx tsx lib/chat-actions/__tests__/router.test.ts
 *
 * Each case asserts: intent, title (when relevant), date/time, should_persist.
 */

import { routeChatMessage } from "../extract";

interface TestCase {
  input:    string;
  intent:   string;
  title?:   string;
  time?:    string | null;
  date?:    string | null;
  persist:  boolean;
}

const TODAY = new Date();
const TODAY_STR = [
  TODAY.getFullYear(),
  String(TODAY.getMonth() + 1).padStart(2, "0"),
  String(TODAY.getDate()).padStart(2, "0"),
].join("-");
const TOMORROW = new Date(TODAY);
TOMORROW.setDate(TOMORROW.getDate() + 1);
const TOMORROW_STR = [
  TOMORROW.getFullYear(),
  String(TOMORROW.getMonth() + 1).padStart(2, "0"),
  String(TOMORROW.getDate()).padStart(2, "0"),
].join("-");

const cases: TestCase[] = [
  // ── Reminders (should_persist = true) ──────────────────────────────────────
  { input: "Remind me to call Crystal at 3pm",
    intent: "reminder", title: "Call Crystal", time: "15:00", persist: true },
  { input: "Set a reminder tomorrow at 9am for hockey bags",
    intent: "reminder", time: "09:00", date: TOMORROW_STR, persist: true },
  { input: "Don't let me forget to email Dave tonight",
    intent: "reminder", title: "Email Dave", time: "20:00", persist: true },
  { input: "Can you set a reminder to call my daughter Grace at 4pm today?",
    intent: "reminder", title: "Call my daughter Grace", time: "16:00", date: TODAY_STR, persist: true },
  { input: "Remind me in 2 hours to switch laundry",
    intent: "reminder", title: "Switch laundry", persist: true },
  { input: "Reminder to pay electric bill Friday",
    intent: "reminder", persist: true },
  { input: "Can you remind me that I need to call my wife when I leave work today at 4:15pm?",
    intent: "reminder", title: "Call my wife when I leave work", time: "16:15", date: TODAY_STR, persist: true },
  { input: "remind me that I have to pick up the kids at 5",
    intent: "reminder", time: "17:00", persist: true },
  { input: "remind me I need to switch laundry in 2 hours",
    intent: "reminder", title: "Switch laundry", persist: true },
  { input: "please remind me to take out the trash tomorrow",
    intent: "reminder", date: TOMORROW_STR, persist: true },
  { input: "nudge me to follow up with the contractor tomorrow at 10am",
    intent: "reminder", time: "10:00", date: TOMORROW_STR, persist: true },
  { input: "ping me about the dentist appointment this afternoon",
    intent: "reminder", time: "13:00", persist: true },
  { input: "don't forget to water the plants this evening",
    intent: "reminder", time: "20:00", persist: true },
  { input: "could you remind me about the parent teacher conference Thursday?",
    intent: "reminder", persist: true },
  { input: "remind me to finish my report in the morning at 9:30am",
    intent: "reminder", title: "Finish my report", time: "09:30", persist: true },
  { input: "remind me in the morning to take my vitamins",
    intent: "reminder", persist: true },
  { input: "set a reminder in the evening to call mom",
    intent: "reminder", persist: true },

  // ── Tasks (should_persist = true) ──────────────────────────────────────────
  { input: "I need to call the contractor tomorrow",
    intent: "task", date: TOMORROW_STR, persist: true },
  { input: "I have to pick up groceries after work",
    intent: "task", persist: true },
  { input: "I should schedule a dentist appointment",
    intent: "task", persist: true },
  { input: "I want to organize the garage this weekend",
    intent: "task", persist: true },
  { input: "I gotta fix the leaky faucet",
    intent: "task", persist: true },
  { input: "I'll do the dishes tonight",
    intent: "task", time: "20:00", persist: true },
  { input: "I will send the report by end of day",
    intent: "task", persist: true },
  { input: "Need to renew my passport",
    intent: "task", persist: true },
  { input: "Have to update the insurance paperwork",
    intent: "task", persist: true },
  { input: "Add a task: buy birthday gift for mom",
    intent: "task", persist: true },
  { input: "Put on my list: oil change for the car",
    intent: "task", persist: true },
  { input: "add todo pick up dry cleaning tomorrow",
    intent: "task", date: TOMORROW_STR, persist: true },
  { input: "I'd like to research summer camps for the kids",
    intent: "task", persist: true },

  // ── Events (should_persist = true) ─────────────────────────────────────────
  { input: "I have a meeting at 2pm tomorrow",
    intent: "event", time: "14:00", date: TOMORROW_STR, persist: true },
  { input: "I have a doctor's appointment Thursday at 10am",
    intent: "event", time: "10:00", persist: true },
  { input: "I have practice at 7pm",
    intent: "event", time: "19:00", persist: true },
  { input: "Dinner at Giovanni's Friday at 7:30pm",
    intent: "event", time: "19:30", persist: true },
  { input: "Lunch with Sarah tomorrow at noon",
    intent: "event", persist: true },
  { input: "I'm meeting Dave for coffee at 3pm",
    intent: "event", time: "15:00", persist: true },
  { input: "Schedule a call with the team Monday at 9am",
    intent: "event", time: "09:00", persist: true },
  { input: "I have a game Saturday at 4pm",
    intent: "event", time: "16:00", persist: true },

  // ── Memory (should_persist = false — handled by memory ingest) ────────────
  { input: "Remember that my wife's name is Crystal",
    intent: "memory", persist: false },
  { input: "Keep in mind that I'm allergic to shellfish",
    intent: "memory", persist: false },
  { input: "For context, I work from home on Fridays",
    intent: "memory", persist: false },
  { input: "I prefer morning meetings over afternoon ones",
    intent: "memory", persist: false },
  { input: "Remember this: my daughter Grace has piano on Tuesdays",
    intent: "memory", persist: false },
  { input: "Note that I don't eat gluten",
    intent: "memory", persist: false },
  { input: "I'm allergic to penicillin",
    intent: "memory", persist: false },
  { input: "My son's name is Quinn and he plays hockey",
    intent: "memory", persist: false },

  // ── Questions (should_persist = false) ─────────────────────────────────────
  { input: "What should I prioritize this week?",
    intent: "question", persist: false },
  { input: "How should I approach the salary negotiation?",
    intent: "question", persist: false },
  { input: "Help me think through the vacation planning",
    intent: "question", persist: false },
  { input: "What do you recommend for better sleep?",
    intent: "question", persist: false },
  { input: "Should I refinance the mortgage?",
    intent: "question", persist: false },
  { input: "Can you help me plan a birthday party for Quinn?",
    intent: "question", persist: false },
  { input: "Do you think I should switch jobs?",
    intent: "question", persist: false },

  // ── None / Conversation (should_persist = false) ──────────────────────────
  { input: "Hey, how's it going?",
    intent: "none", persist: false },
  { input: "Thanks, that's helpful",
    intent: "none", persist: false },
  { input: "ok",
    intent: "none", persist: false },
  { input: "Good morning!",
    intent: "none", persist: false },

  // ── Fragment rejection (should_persist = false despite matching) ───────────
  { input: "I need to",
    intent: "none", persist: false },
];

// ── Test runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

for (const tc of cases) {
  const result = routeChatMessage([{ role: "user", content: tc.input }]);

  const checks: string[] = [];

  if (result.intent !== tc.intent) {
    checks.push(`intent: expected "${tc.intent}", got "${result.intent}"`);
  }

  if (tc.title !== undefined && result.title !== tc.title) {
    checks.push(`title: expected "${tc.title}", got "${result.title}"`);
  }

  if (tc.time !== undefined) {
    if (tc.time === null && result.time !== null) {
      checks.push(`time: expected null, got "${result.time}"`);
    } else if (tc.time !== null && result.time !== tc.time) {
      checks.push(`time: expected "${tc.time}", got "${result.time}"`);
    }
  }

  if (tc.date !== undefined) {
    if (tc.date === null && result.date !== null) {
      checks.push(`date: expected null, got "${result.date}"`);
    } else if (tc.date !== null && result.date !== tc.date) {
      checks.push(`date: expected "${tc.date}", got "${result.date}"`);
    }
  }

  if (result.should_persist !== tc.persist) {
    checks.push(`persist: expected ${tc.persist}, got ${result.should_persist}`);
  }

  if (checks.length === 0) {
    passed++;
  } else {
    failed++;
    failures.push(`FAIL: "${tc.input.slice(0, 60)}"\n  ${checks.join("\n  ")}`);
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log(`Chat Intent Router Tests: ${passed} passed, ${failed} failed out of ${cases.length}`);
console.log(`${"=".repeat(60)}\n`);

if (failures.length > 0) {
  for (const f of failures) {
    console.log(f);
    console.log();
  }
  process.exit(1);
} else {
  console.log("All tests passed.");
}
