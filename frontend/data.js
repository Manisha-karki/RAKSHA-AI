// Mock case data — swap this for a real DB (Mongo/Postgres) later.
const cases = [
  {
    id: 1, name: "Case #A104", channel: "SMS", riskTier: "high", escalated: false,
    history: [
      { week: 1, score: 30 }, { week: 2, score: 35 },
      { week: 3, score: 55, event: "Hearing delayed" }, { week: 4, score: 60 },
      { week: 5, score: 78, event: "Threat reported" }, { week: 6, score: 82 },
      { week: 7, score: 80 }, { week: 8, score: 85 }
    ]
  },
  {
    id: 2, name: "Case #B217", channel: "IVRS", riskTier: "medium", escalated: false,
    history: [
      { week: 1, score: 20 }, { week: 2, score: 25 }, { week: 3, score: 30 },
      { week: 4, score: 45, event: "Court appearance" }, { week: 5, score: 50 },
      { week: 6, score: 48 }, { week: 7, score: 52 }, { week: 8, score: 55 }
    ]
  },
  {
    id: 3, name: "Case #C332", channel: "Web", riskTier: "low", escalated: false,
    history: [
      { week: 1, score: 15 }, { week: 2, score: 18 }, { week: 3, score: 12 },
      { week: 4, score: 20 }, { week: 5, score: 22 }, { week: 6, score: 19 },
      { week: 7, score: 17 }, { week: 8, score: 15 }
    ]
  },
  {
    id: 4, name: "Case #D059", channel: "Chatbot", riskTier: "high", escalated: false,
    history: [
      { week: 1, score: 40 }, { week: 2, score: 55 },
      { week: 3, score: 60, event: "Investigation delay" }, { week: 4, score: 70 },
      { week: 5, score: 75, event: "Social ostracism reported" }, { week: 6, score: 78 },
      { week: 7, score: 88 }, { week: 8, score: 90 }
    ]
  }
];

const MOOD_SCORE = { great: 10, okay: 35, low: 65, struggling: 90 };
const RISK_WORDS = ["threat", "scared", "afraid", "hopeless", "unsafe", "alone", "give up"];

// Seed users — plain-text here only for readability. server.js hashes these
// with bcrypt at boot before they ever sit in the in-memory `users` array,
// and every new signup is hashed the same way. Swap this whole module for a
// real DB (with users created only via the hashed signup path) later.
const seedUsers = [
  { username: "victim1", password: "test123", name: "Victim One" },
  { username: "demo", password: "demo123", name: "Demo User" }
];

// Mutable in-memory store, populated (with hashed passwords) by server.js on boot.
const users = [];

// --- FAQ knowledge base for the chat assistant (no external API, no cost) ---
const FAQS = [
  {
    keywords: ["hi", "hello", "hey", "good morning", "good evening"],
    answer: "Hello, I'm here to support you. You're welcome to ask me how RAKSHA works, or simply share how you're doing today."
  },
  {
    keywords: ["thank you", "thanks", "appreciate"],
    answer: "You're very welcome. I'm here whenever you'd like to talk or have a question."
  },
  {
    keywords: ["what is raksha", "what does this app do", "about this app", "purpose of this app"],
    answer: "RAKSHA is a check-in and support platform designed to help you share how you're doing over time, so your assigned caseworker can stay informed and reach out when support may be needed."
  },
  {
    keywords: ["how do check-ins work", "how does check in work", "what is a check-in"],
    answer: "A check-in lets you record your current mood and, optionally, a short note. This information is reviewed by your caseworker and helps build a picture of how you're doing over time."
  },
  {
    keywords: ["risk score", "risk tier", "how is my score calculated", "how does scoring work"],
    answer: "Your risk indicator is generated from the mood you select and the content of any notes you share. It is intended to help your caseworker notice patterns and respond appropriately — it is not a judgment of you personally."
  },
  {
    keywords: ["who can see", "who sees my", "privacy", "confidential", "is this private"],
    answer: "Your check-ins and messages are visible to your assigned caseworker and the support team managing your case. If you have specific concerns about how your information is handled, please raise them with your caseworker or program administrator."
  },
  {
    keywords: ["contact my caseworker", "reach my caseworker", "talk to my caseworker", "speak to someone"],
    answer: "You can reach your caseworker using the contact details they have already shared with you. If you're not sure how to reach them, please contact your program administrator for assistance."
  },
  {
    keywords: ["change my caseworker", "different caseworker", "new caseworker"],
    answer: "Requests to change your assigned caseworker are handled outside of this platform. Please raise this directly with your program administrator."
  },
  {
    keywords: ["escalate", "what happens if i escalate", "escalate to caseworker"],
    answer: "Escalating a case flags it for priority attention from your caseworker. It does not replace emergency services — if you are in immediate danger, please contact them directly."
  },
  {
    keywords: ["how often should i check in", "when should i check in", "how many times a week"],
    answer: "There is no fixed schedule. Checking in as often as feels right for you — whether daily or a few times a week — helps your caseworker stay informed."
  },
  {
    keywords: ["missed a check-in", "forgot to check in", "didn't check in"],
    answer: "There is no penalty for missing a check-in. You can check in again whenever you're ready."
  },
  {
    keywords: ["forgot password", "reset password", "can't log in", "cannot log in"],
    answer: "This version of RAKSHA does not yet support automatic password resets. Please contact your program administrator for help regaining access to your account."
  },
  {
    keywords: ["delete my data", "remove my information", "delete my account"],
    answer: "For questions about deleting or managing your stored information, please contact your program administrator directly."
  },
  {
    keywords: ["shared device", "public computer", "someone else uses this"],
    answer: "If you're using a shared or public device, please remember to sign out after each session to help keep your information private."
  },
  {
    keywords: ["not feel safe", "in danger", "unsafe right now", "emergency", "someone is threatening me"],
    answer: "If you are in immediate danger, please contact local emergency services at 📞 112 right away. I'm not able to provide emergency assistance directly, but I'm here if you'd like to talk, and your caseworker will see that you've reached out."
  },
  {
    keywords: ["i want to die", "want to die", "don't want to live", "do not want to live", "dont want to live", "end my life", "end it all", "kill myself", "suicide", "suicidal", "no reason to live", "better off dead", "hurt myself", "harm myself", "not worth living"],
    answer: "I'm really sorry you're hurting this much. I want to take what you're saying seriously. Please don't stay alone right now — move away from anything you could use to hurt yourself and contact someone you trust. In India, you can call the 24×7 Tele-MANAS mental-health helpline at 📞 14416 or 1800-89-14416. If you are in immediate danger or think you may act on these thoughts, call 📞 112 or go to the nearest emergency department. Are you in immediate danger right now?"
  },
  {
    keywords: ["is this a substitute", "replace emergency", "instead of calling"],
    answer: "RAKSHA is a support and monitoring tool, not a replacement for emergency services. In an urgent situation, please contact local emergency services directly."
  },
  {
    keywords: ["technical issue", "bug", "not working", "error"],
    answer: "I'm sorry you're running into an issue. Please let your program administrator know the details so it can be looked into."
  }
];

module.exports = { cases, MOOD_SCORE, RISK_WORDS, users, seedUsers, FAQS };