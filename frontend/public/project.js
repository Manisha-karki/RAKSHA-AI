// --- Theme (light/dark) — applied immediately, before auth, so the login
// screen itself is themed too. Persisted in localStorage. ---
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

(function initTheme() {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
})();

// --- Auth gate: show app only if a valid session token exists ---
function showLoggedInUser() {
  const el = document.getElementById("logged-in-as");
  const name = localStorage.getItem("auth_name");
  const username = localStorage.getItem("auth_username");
  if (el) el.textContent = name ? `Signed in as ${name}` : username ? `Signed in as ${username}` : "";
  updateProfilePanel();
}

function updateProfilePanel() {
  const name = localStorage.getItem("auth_name");
  const username = localStorage.getItem("auth_username") || "";
  const picture = localStorage.getItem("auth_picture");

  const nameEl = document.getElementById("profile-name");
  const userEl = document.getElementById("profile-username");
  const avatarEl = document.getElementById("profile-avatar");
  if (!nameEl || !userEl || !avatarEl) return;

  nameEl.textContent = name || username || "—";
  userEl.textContent = username;

  if (picture) {
    avatarEl.style.backgroundImage = `url("${picture}")`;
    avatarEl.textContent = "";
  } else {
    avatarEl.style.backgroundImage = "";
    const initial = (name || username || "?").trim().charAt(0).toUpperCase();
    avatarEl.textContent = initial || "?";
  }
}

function checkAuthOnLoad() {
  const token = localStorage.getItem("auth_token");
  if (token) {
    document.getElementById("login-root").style.display = "none";
    document.getElementById("app-root").style.display = "block";
    showLoggedInUser();
  }
}

// Called by login.js right after a successful login/signup/Google sign-in —
// this is what lands the user on the dashboard immediately after auth.
window.onAppUnlocked = function (username) {
  showLoggedInUser();
  switchTab("dashboard");
};

function logout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_username");
  localStorage.removeItem("auth_name");
  localStorage.removeItem("auth_picture");
  location.reload();
}

// --- State ---
let selectedCaseId = null;
let chartInstance = null;

// --- Elements ---
// NOTE: these IDs match the renamed "RAKSHA AI" tab/container in index.html.
// If you rename the tab again, update these two lines to match.
const tabCheckin = document.getElementById("tab-RAKSHA AI");
const tabDashboard = document.getElementById("tab-dashboard");
const viewCheckin = document.getElementById("view-RAKSHA AI");
const viewDashboard = document.getElementById("view-dashboard");
const caseTableBody = document.getElementById("case-table-body");
const noResultsEl = document.getElementById("no-results");
const searchEl = document.getElementById("case-search");
const riskFilterEl = document.getElementById("risk-filter");
const statTotal = document.getElementById("stat-total");
const statHigh = document.getElementById("stat-high");
const statEscalated = document.getElementById("stat-escalated");
const statAvg = document.getElementById("stat-avg");
const sidebarItems = document.querySelectorAll(".sidebar-item");
const logoutBtn = document.getElementById("logout-btn");
let allCases = []; // full list, unfiltered
const detailCard = document.getElementById("detail-card");
const detailTitle = document.getElementById("detail-title");
const explainListEl = document.getElementById("explain-list");
const escalateBtn = document.getElementById("escalate-btn");

// --- Tab switching ---
tabCheckin.addEventListener("click", () => switchTab("checkin"));
tabDashboard.addEventListener("click", () => switchTab("dashboard"));

function switchTab(tab) {
  tabCheckin.classList.toggle("active", tab === "checkin");
  tabDashboard.classList.toggle("active", tab === "dashboard");
  viewCheckin.style.display = tab === "checkin" ? "block" : "none";
  viewDashboard.style.display = tab === "dashboard" ? "block" : "none";
  if (tab === "dashboard") loadCases();
}

// --- Sidebar nav (Dashboard / Cases / Alerts / Reports / Settings) ---
logoutBtn.addEventListener("click", logout);
sidebarItems.forEach(item => {
  item.addEventListener("click", () => {
    sidebarItems.forEach(i => i.classList.remove("active"));
    item.classList.add("active");
    const panel = item.dataset.panel;

    if (panel === "cases") {
      document.querySelector(".case-table").scrollIntoView({ behavior: "smooth" });
    } else if (panel === "soon") {
      alert("This section is coming soon in a future build.");
    }
    // "overview" needs no extra action — the dashboard is already shown
  });
});

// --- Dashboard: case list (with localStorage fallback if the fetch fails) ---
async function loadCases() {
  try {
    const res = await fetch("/api/cases");
    allCases = await res.json();
    localStorage.setItem("cases_cache", JSON.stringify(allCases));
  } catch (e) {
    const cached = localStorage.getItem("cases_cache");
    allCases = cached ? JSON.parse(cached) : [];
  }
  updateStats();
  renderCases();
}

function updateStats() {
  statTotal.textContent = allCases.length;
  statHigh.textContent = allCases.filter(c => c.riskTier === "high").length;
  statEscalated.textContent = allCases.filter(c => c.escalated).length;
  const avg = allCases.length
    ? Math.round(allCases.reduce((sum, c) => sum + (c.currentScore || 0), 0) / allCases.length)
    : 0;
  statAvg.textContent = avg;
}

// Escapes text before it goes into innerHTML, so a case name/channel coming
// from the API can never inject markup into the page.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderCases() {
  const query = searchEl.value.trim().toLowerCase();
  const riskValue = riskFilterEl.value;

  const filtered = allCases.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(query);
    const matchesRisk = riskValue === "all" || c.riskTier === riskValue;
    return matchesSearch && matchesRisk;
  });

  caseTableBody.innerHTML = "";
  noResultsEl.style.display = filtered.length ? "none" : "block";

  filtered.forEach(c => {
    const trendClass = c.trend > 0 ? "trend-up" : c.trend < 0 ? "trend-down" : "trend-flat";
    const trendArrow = c.trend > 0 ? "▲" : c.trend < 0 ? "▼" : "–";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.channel)}</td>
      <td>${c.currentScore ?? "-"}</td>
      <td class="${trendClass}">${trendArrow} ${Math.abs(c.trend)}</td>
      <td><span class="tier ${escapeHtml(c.riskTier)}">${escapeHtml(c.riskTier)}${c.escalated ? " · escalated" : ""}</span></td>
    `;
    tr.addEventListener("click", () => loadDetail(c.id));
    caseTableBody.appendChild(tr);
  });
}

// Live search + filter — respond to input as the user types, no reload
searchEl.addEventListener("input", renderCases);
riskFilterEl.addEventListener("change", renderCases);

// --- Dashboard: case detail + trend chart ---
async function loadDetail(id) {
  selectedCaseId = id;
  const res = await fetch(`/api/cases/${id}/history`);
  const detail = await res.json();

  detailCard.style.display = "block";
  const latest = detail.history[detail.history.length - 1].score;
  detailTitle.textContent = `${detail.name} — current score: ${latest}`;

  explainListEl.innerHTML = "";
  detail.explain.forEach(e => {
    const li = document.createElement("li");
    li.textContent = e;
    explainListEl.appendChild(li);
  });

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(document.getElementById("trend-chart"), {
    type: "line",
    data: {
      labels: detail.history.map(h => "Wk " + h.week),
      datasets: [{
        label: "Distress score",
        data: detail.history.map(h => h.score),
        borderColor: "#4f46e5",
        tension: 0.3
      }]
    },
    options: { scales: { y: { min: 0, max: 100 } } }
  });
}

escalateBtn.addEventListener("click", async () => {
  if (!selectedCaseId) return;
  await fetch("/api/escalate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId: selectedCaseId })
  });
  loadCases();
});

// --- Init ---
checkAuthOnLoad();