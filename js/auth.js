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
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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

function navigateWithFade(url) {
  const main = document.getElementById("main");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !main) {
    window.location.href = url;
    return;
  }
  main.classList.add("js-nav-fade");
  window.setTimeout(() => {
    window.location.href = url;
  }, 280);
}

function renderHeaderSignedOut(signInBtn, signUpBtn) {
  signUpBtn.style.display = "";
  signInBtn.textContent = "Sign In";
  const next = safeNextPath(window.location.pathname);
  signInBtn.onclick = () => {
    navigateWithFade(`/login.html?next=${encodeURIComponent(next)}`);
  };
  signUpBtn.onclick = () => {
    navigateWithFade(`/login.html?mode=signup&next=${encodeURIComponent(next)}`);
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

// Bridge so classic (non-module) scripts — lesson-parts.js, hotspot.js,
// quiz.js — can sync progress to Firestore under the signed-in user without
// each needing their own Firebase import. Progress is organized per user as
// users/{uid}/lessons/{pageId} and users/{uid}/quizzes/{pageId}, one doc per
// page that gets overwritten (merged) on every save — never duplicated.
let resolveAuthReady;
const authReadyPromise = new Promise((resolve) => {
  resolveAuthReady = resolve;
});
let authReadyResolved = false;
onAuthStateChanged(auth, (user) => {
  if (!authReadyResolved) {
    authReadyResolved = true;
    resolveAuthReady(user);
  }
});

function cloudDocRef(kind, pageId) {
  const user = auth.currentUser;
  if (!user) return null;
  return doc(db, "users", user.uid, kind, pageId);
}

async function saveCloudProgress(kind, pageId, data) {
  try {
    const ref = cloudDocRef(kind, pageId);
    if (!ref) return;
    await setDoc(ref, { ...data, updatedAt: Date.now() }, { merge: true });
  } catch (e) {}
}

async function loadCloudProgress(kind, pageId) {
  try {
    const ref = cloudDocRef(kind, pageId);
    if (!ref) return null;
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    return null;
  }
}

// Firestore is the source of truth for signed-in users — localStorage is
// just a fast local cache. applyFn(cloudData) should make localStorage match
// the cloud exactly (writing new values, and clearing anything local that
// the cloud no longer has, e.g. after a support-side deletion) and return
// true only if it actually changed something. Reloads once so the page's
// normal localStorage-reading code picks up the corrected value. cloudData
// is always an object — {} when no cloud doc exists (never saved, or deleted).
function hydratePageProgress(kind, pageId, applyFn) {
  authReadyPromise.then((user) => {
    if (!user) return;
    loadCloudProgress(kind, pageId).then((data) => {
      let wrote = false;
      try {
        wrote = !!applyFn(data || {});
      } catch (e) {}
      if (!wrote) return;
      const flagKey = "tb:hydrated:" + kind + ":" + pageId;
      try {
        if (window.sessionStorage.getItem(flagKey)) return;
        window.sessionStorage.setItem(flagKey, "1");
      } catch (e) {}
      window.location.reload();
    });
  });
}

window.TB = window.TB || {};
window.TB.saveCloudProgress = saveCloudProgress;
window.TB.loadCloudProgress = loadCloudProgress;
window.TB.hydratePageProgress = hydratePageProgress;

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
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
};
