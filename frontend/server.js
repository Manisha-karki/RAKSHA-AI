const express = require('express');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { cases, MOOD_SCORE, RISK_WORDS, users, seedUsers, FAQS } = require('./data');

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Google Sign-In setup ---
const GOOGLE_CLIENT_ID = "862518482917-lkkk70jvls23741kl958sqg66vojnl1f.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// --- Boot: hash the seed users once so nothing plaintext ever sits in `users` ---
seedUsers.forEach(u => {
  users.push({
    username: u.username,
    name: u.name,
    passwordHash: bcrypt.hashSync(u.password, 10)
  });
});

function makeToken(username) {
  return `mock-token-${crypto.randomBytes(16).toString('hex')}-${username}`;
}

// --- Auth: username/password ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    const user = users.find(u => u.username === username);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "This account uses Google sign-in — please use the Google button." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid username or password" });

    res.json({ token: makeToken(user.username), username: user.username, name: user.name });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Auth: sign up ---
app.post('/api/signup', async (req, res) => {
  try {
    const { username, password, name } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    if (users.some(u => u.username === username)) return res.status(409).json({ error: "That username is already taken" });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = { username, name: name || username, passwordHash };
    users.push(newUser);

    res.json({ token: makeToken(newUser.username), username: newUser.username, name: newUser.name });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Google Sign-In: verify the credential Google sent the frontend ---
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: "Missing credential" });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!users.some(u => u.username === payload.email)) {
      users.push({ username: payload.email, name: payload.name, passwordHash: null, google: true });
    }

    res.json({
      token: makeToken(payload.sub),
      username: payload.email,
      name: payload.name,
      picture: payload.picture
    });
  } catch (err) {
    console.error("Google token verification failed:", err.message);
    res.status(401).json({ error: "Invalid Google credential" });
  }
});

function scoreNote(note) {
  if (!note) return { bump: 0, hits: [] };
  const lower = note.toLowerCase();
  const hits = RISK_WORDS.filter(w => lower.includes(w));
  return { bump: Math.min(hits.length * 10, 30), hits };
}

function riskTierFor(score) {
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

// --- Routes ---
app.post('/api/checkin', (req, res) => {
  const { caseId, mood, note } = req.body || {};
  if (typeof note === 'string' && note.length > 2000) {
    return res.status(400).json({ error: "Note is too long" });
  }
  const base = MOOD_SCORE[mood] ?? 50;
  const { bump, hits } = scoreNote(note);
  const score = Math.min(base + bump, 100);

  const explain = [`Mood selected: "${mood}" (base score ${base})`];
  if (hits.length) explain.push(`Flagged terms in note: ${hits.join(", ")} (+${bump})`);

  const target = cases.find(c => c.id === Number(caseId));
  if (target) {
    target.history.push({ week: target.history.length + 1, score });
    target.riskTier = riskTierFor(score);
  }

  res.json({ score, riskTier: riskTierFor(score), explain });
});

app.get('/api/cases', (req, res) => {
  res.json(cases.map(c => {
    const h = c.history;
    const trend = h.length >= 2 ? h[h.length - 1].score - h[h.length - 2].score : 0;
    return {
      id: c.id, name: c.name, channel: c.channel,
      riskTier: c.riskTier, escalated: c.escalated,
      currentScore: h[h.length - 1]?.score ?? null,
      trend
    };
  }));
});

app.get('/api/cases/:id/history', (req, res) => {
  const c = cases.find(c => c.id === Number(req.params.id));
  if (!c) return res.status(404).json({ error: "not found" });
  const trend = c.history[c.history.length - 1].score - c.history[0].score;
  const explain = [
    `Trend over ${c.history.length} weeks: ${trend >= 0 ? "+" : ""}${trend} points`,
    ...c.history.filter(h => h.event).map(h => `Week ${h.week}: score ${h.score} — event: ${h.event}`)
  ];
  res.json({ ...c, explain });
});

// --- Chat: FAQ-based responder (no external API, no cost) ---
app.post('/api/chat', (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: "Missing message" });
  }

  const lower = message.toLowerCase();

  const riskHits = RISK_WORDS.filter(w => lower.includes(w));
  if (riskHits.length) {
    return res.json({
      reply: "It sounds like things might be really hard right now. I'm not able to provide emergency help myself — please reach out to your caseworker or local emergency services if you're in danger. I'm still here if you want to talk."
    });
  }

  const match = FAQS.find(faq => faq.keywords.some(k => lower.includes(k)));
  if (match) {
    return res.json({ reply: match.answer });
  }

  res.json({
    reply: "Thank you for your message. I don't have a specific answer for that yet, but your caseworker will see this conversation and can follow up with you directly."
  });
});

app.post('/api/escalate', (req, res) => {
  const { caseId } = req.body || {};
  const c = cases.find(c => c.id === Number(caseId));
  if (!c) return res.status(404).json({ error: "not found" });
  c.escalated = true;
  res.json({ ok: true, case: c });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;