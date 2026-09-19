// --- Google Sign-In setup ---
// Must match the GOOGLE_CLIENT_ID in server.js exactly.
const GOOGLE_CLIENT_ID = "862518482917-lkkk70jvls23741kl958sqg66vojnl1f.apps.googleusercontent.com";

const { useState, useEffect, useRef, createElement: h } = React;

function unlockApp(data) {
  localStorage.setItem("auth_token", data.token);
  localStorage.setItem("auth_username", data.username);
  if (data.name) localStorage.setItem("auth_name", data.name);
  if (data.picture) localStorage.setItem("auth_picture", data.picture);
  else localStorage.removeItem("auth_picture");

  document.getElementById("login-root").style.display = "none";
  document.getElementById("app-root").style.display = "block";
  // Land the user straight on the dashboard, right after they've authenticated.
  if (typeof window.onAppUnlocked === "function") window.onAppUnlocked(data.username);
}

function GoogleButton() {
  const ref = useRef(null);

  useEffect(() => {
    if (!window.google || !ref.current) return; // GSI script may still be loading

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          const res = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response.credential })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Google sign-in failed");
          unlockApp(data);
        } catch (err) {
          console.error(err);
          alert("Google sign-in failed. Please try again.");
        }
      }
    });

    window.google.accounts.id.renderButton(ref.current, {
      theme: "outline",
      size: "large",
      width: 320
    });
  }, []);

  return h("div", { className: "google-btn-wrap", ref });
}

function LoginScreen() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const endpoint = mode === "signin" ? "/api/login" : "/api/signup";
      const body = mode === "signin" ? { username, password } : { username, password, name };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      unlockApp(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return h("div", { className: "login-screen" },
    h("div", { className: "login-card" },
      h("h1", { className: "login-title" }, "RAKSHA"),
      h("p", { className: "login-subtitle" },
        mode === "signin" ? "Sign in to continue" : "Create an account to get started"),

      h("div", { className: "login-tabs" },
        h("button", {
          type: "button",
          className: "login-tab" + (mode === "signin" ? " active" : ""),
          onClick: () => { setMode("signin"); setError(""); }
        }, "Sign in"),
        h("button", {
          type: "button",
          className: "login-tab" + (mode === "signup" ? " active" : ""),
          onClick: () => { setMode("signup"); setError(""); }
        }, "Sign up")
      ),

      h("form", { className: "login-form", onSubmit: handleSubmit },
        mode === "signup" && h("input", {
          type: "text", placeholder: "Your name", value: name,
          onChange: (e) => setName(e.target.value)
        }),
        h("input", {
          type: "text", placeholder: "Username", value: username, autoComplete: "username",
          onChange: (e) => setUsername(e.target.value), required: true
        }),
        h("input", {
          type: "password", placeholder: "Password", value: password,
          autoComplete: mode === "signin" ? "current-password" : "new-password",
          onChange: (e) => setPassword(e.target.value), required: true
        }),
        error && h("div", { className: "login-error" }, error),
        h("button", { type: "submit", className: "login-submit", disabled: busy },
          busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up")
      ),

      h("div", { className: "login-divider" }, h("span", null, "or")),
      h(GoogleButton, null)
    )
  );
}

ReactDOM.createRoot(document.getElementById("login-root")).render(h(LoginScreen, null));