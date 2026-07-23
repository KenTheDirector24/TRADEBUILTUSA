import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function safeNextPath(rawNext) {
  if (typeof rawNext === "string" && /^\/(?!\/)/.test(rawNext)) return rawNext;
  return "/index.html";
}

async function startSession(user) {
  const idToken = await user.getIdToken();
  const res = await fetch("/api/session-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("Could not start session");
}

async function endSession() {
  await fetch("/api/session-logout", { method: "POST" }).catch(() => {});
}

async function signOutEverywhere() {
  await endSession();
  await firebaseSignOut(auth).catch(() => {});
  window.location.href = "/index.html";
}

const SIGNED_IN_HINT_KEY = "tb_signed_in_hint";

function renderHeaderSignedIn(signInBtn, signUpBtn) {
  signUpBtn.style.display = "none";
  signInBtn.textContent = "Sign Out";
  signInBtn.onclick = () => signOutEverywhere();
}

function renderHeaderSignedOut(signInBtn, signUpBtn) {
  signUpBtn.style.display = "";
  signInBtn.textContent = "Sign In";
  const next = safeNextPath(window.location.pathname);
  signInBtn.onclick = () => {
    window.location.href = `/login.html?next=${encodeURIComponent(next)}`;
  };
  signUpBtn.onclick = () => {
    window.location.href = `/login.html?mode=signup&next=${encodeURIComponent(next)}`;
  };
}

function wireHeaderButtons() {
  const signInBtn = document.querySelector(".header-actions__signin");
  const signUpBtn = document.querySelector(".header-actions__signup");
  if (!signInBtn || !signUpBtn) return;

  // Render optimistically from the last known state so the header doesn't
  // flash "Sign In" while Firebase resolves the real auth state on each
  // page load. This is just a UI hint, never used for access control.
  if (localStorage.getItem(SIGNED_IN_HINT_KEY) === "1") {
    renderHeaderSignedIn(signInBtn, signUpBtn);
  } else {
    renderHeaderSignedOut(signInBtn, signUpBtn);
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      localStorage.setItem(SIGNED_IN_HINT_KEY, "1");
      renderHeaderSignedIn(signInBtn, signUpBtn);
    } else {
      localStorage.removeItem(SIGNED_IN_HINT_KEY);
      renderHeaderSignedOut(signInBtn, signUpBtn);
    }
  });
}

wireHeaderButtons();

export {
  auth,
  startSession,
  endSession,
  signOutEverywhere,
  safeNextPath,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
};
