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

function wireHeaderButtons() {
  const signInBtn = document.querySelector(".header-actions__signin");
  const signUpBtn = document.querySelector(".header-actions__signup");
  if (!signInBtn || !signUpBtn) return;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      signUpBtn.hidden = true;
      signInBtn.textContent = "Sign Out";
      signInBtn.onclick = () => signOutEverywhere();
    } else {
      signUpBtn.hidden = false;
      signInBtn.textContent = "Sign In";
      const next = safeNextPath(window.location.pathname);
      signInBtn.onclick = () => {
        window.location.href = `/login.html?next=${encodeURIComponent(next)}`;
      };
      signUpBtn.onclick = () => {
        window.location.href = `/login.html?mode=signup&next=${encodeURIComponent(next)}`;
      };
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
