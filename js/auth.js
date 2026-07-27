import { firebaseConfig } from "./firebase-config.js";
import { ANNOUNCEMENTS } from "./announcements-data.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
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
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  listAll,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

function safeNextPath(rawNext) {
  if (typeof rawNext === "string" && /^\/(?!\/)/.test(rawNext)) return rawNext;
  return "/index.html";
}

async function ensureUserProfile(user, extra = {}) {
  try {
    await setDoc(
      doc(db, "users", user.uid),
      { email: user.email, ...extra, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {}
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

// Per-page lesson/quiz progress and the "breaking ground" achievement flag
// are cached in localStorage under keys that aren't scoped per-user. Left
// alone, they bleed into the next account signed in on this browser (e.g. a
// lesson opening on a previous account's slide, a quiz showing someone
// else's answers/score/history, or a badge briefly showing as already
// earned). Clear them on sign-out, account deletion, and new signup so
// every account starts from a clean local cache.
const LOCAL_CACHE_KEY_PREFIXES = [
  "tb:lesson-progress:",
  "tb:lesson-status:",
  "tb:quiz-score:",
  "tb:quiz-answers:",
  "tb:quiz-history:",
  "tb:quiz-settings:",
  "tb:quiz-order:",
  "tb:hotspot-progress:",
];

function clearLocalUserCaches() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (
        key === "tb:achievement-breaking-ground" ||
        (key && LOCAL_CACHE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)))
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {}
}

async function signOutEverywhere() {
  await endSession();
  await firebaseSignOut(auth).catch(() => {});
  clearProfileHint();
  clearLocalUserCaches();
  window.location.href = "/index.html";
}

async function deleteAccountEverywhere() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/delete-account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Could not delete account");
  }
  localStorage.removeItem(SIGNED_IN_HINT_KEY);
  clearLocalUserCaches();
  clearProfileHint();
  await firebaseSignOut(auth).catch(() => {});
  window.location.href = "/index.html";
}

const SIGNED_IN_HINT_KEY = "tb_signed_in_hint";
const PROFILE_HINT_KEY = "tb_profile_hint";

// Small cross-page cache of the signed-in user's name/photo so the header
// can render a real avatar instantly on every page load without an extra
// Firestore read. Written whenever account.html or the sign-up/Google flow
// in login.html learns the user's name or photo; read-only everywhere else.
function getProfileHint() {
  try {
    const raw = localStorage.getItem(PROFILE_HINT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setProfileHint(profile) {
  try {
    localStorage.setItem(PROFILE_HINT_KEY, JSON.stringify(profile));
  } catch (e) {}
}

function clearProfileHint() {
  try {
    localStorage.removeItem(PROFILE_HINT_KEY);
  } catch (e) {}
}

function initialsFrom(firstName, lastName, email) {
  const a = (firstName || "").trim().charAt(0);
  const b = (lastName || "").trim().charAt(0);
  if (a || b) return (a + b).toUpperCase();
  return (email || "?").trim().charAt(0).toUpperCase();
}

function splitDisplayName(displayName) {
  const parts = (displayName || "").trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
}

function renderAccountLink(accountLink, profile, email) {
  if (!accountLink) return;
  const firstName = (profile && profile.firstName) || "";
  const lastName = (profile && profile.lastName) || "";
  const photoURL = (profile && profile.photoURL) || "";
  const initials = initialsFrom(firstName, lastName, email);
  const displayName = firstName || "Account";

  // The per-page inline bootstrap script already paints this from the
  // cached profile hint before this module runs, and onAuthStateChanged
  // re-invokes this after every page load. Skip rebuilding the DOM (which
  // recreates the <img> and forces a re-decode/repaint) when nothing about
  // the rendered profile actually changed, so the header doesn't flicker.
  if (
    accountLink.dataset.tbPhoto === photoURL &&
    accountLink.dataset.tbInitials === initials &&
    accountLink.dataset.tbName === displayName
  ) {
    return;
  }
  accountLink.dataset.tbPhoto = photoURL;
  accountLink.dataset.tbInitials = initials;
  accountLink.dataset.tbName = displayName;

  accountLink.textContent = "";

  const avatar = document.createElement("span");
  avatar.className = "header-actions__avatar";
  if (photoURL) {
    const img = document.createElement("img");
    img.src = photoURL;
    img.alt = "";
    avatar.appendChild(img);
  } else {
    const initialsEl = document.createElement("span");
    initialsEl.className = "header-actions__avatar-initials";
    initialsEl.textContent = initials;
    avatar.appendChild(initialsEl);
  }

  const nameEl = document.createElement("span");
  nameEl.className = "header-actions__account-name";
  nameEl.textContent = displayName;

  accountLink.appendChild(avatar);
  accountLink.appendChild(nameEl);
}

function renderHeaderSignedIn(signInBtn, signUpBtn, profile, email) {
  signUpBtn.style.display = "none";
  signInBtn.textContent = "Sign Out";
  signInBtn.classList.add("header-actions__signin--signed-in");
  signInBtn.onclick = () => signOutEverywhere();
  const accountLink = document.querySelector(".header-actions__account");
  if (accountLink) {
    accountLink.hidden = false;
    renderAccountLink(accountLink, profile, email);
  }
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

function renderHeroCta(user) {
  const heroCta = document.getElementById("hero-cta");
  if (!heroCta) return;
  if (user) {
    heroCta.textContent = "Upcoming Updates!";
    heroCta.setAttribute("href", "updates.html");
  } else {
    heroCta.textContent = "Join Today!";
    heroCta.setAttribute("href", "login.html#mode=signup");
  }
}

function renderHeaderSignedOut(signInBtn, signUpBtn) {
  signUpBtn.style.display = "";
  signInBtn.textContent = "Sign In";
  signInBtn.classList.remove("header-actions__signin--signed-in");
  const next = safeNextPath(window.location.pathname);
  signInBtn.onclick = () => {
    navigateWithFade(`/login.html#next=${encodeURIComponent(next)}`);
  };
  signUpBtn.onclick = () => {
    navigateWithFade(`/login.html#mode=signup&next=${encodeURIComponent(next)}`);
  };
  const accountLink = document.querySelector(".header-actions__account");
  if (accountLink) accountLink.hidden = true;
}

let deleteModalEls = null;

function buildDeleteAccountModal() {
  const overlay = document.createElement("div");
  overlay.className = "tb-modal-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="tb-modal" role="dialog" aria-modal="true" aria-labelledby="tb-delete-modal-title">
      <h2 id="tb-delete-modal-title">Delete your account?</h2>
      <p class="tb-modal__warning">This permanently deletes your account and everything associated to it. This cannot be undone!</p>
      <label class="tb-modal__label" for="tb-delete-confirm-input">Type <strong>delete</strong> to confirm</label>
      <input type="text" id="tb-delete-confirm-input" class="tb-modal__input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="delete">
      <p class="tb-modal__error" hidden></p>
      <div class="tb-modal__actions">
        <button type="button" class="btn btn-sm btn-light tb-modal__cancel">Cancel</button>
        <button type="button" class="btn btn-sm tb-modal__delete-btn" disabled>Delete Account</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const modal = overlay.querySelector(".tb-modal");
  const input = overlay.querySelector(".tb-modal__input");
  const errorEl = overlay.querySelector(".tb-modal__error");
  const cancelBtn = overlay.querySelector(".tb-modal__cancel");
  const confirmBtn = overlay.querySelector(".tb-modal__delete-btn");

  const close = () => {
    overlay.hidden = true;
    input.value = "";
    errorEl.hidden = true;
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Delete Account";
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  modal.addEventListener("click", (e) => e.stopPropagation());
  cancelBtn.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) close();
  });

  input.addEventListener("input", () => {
    confirmBtn.disabled = input.value.trim().toLowerCase() !== "delete";
  });

  confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Deleting…";
    errorEl.hidden = true;
    try {
      await deleteAccountEverywhere();
    } catch (e) {
      errorEl.textContent = e.message || "Could not delete account. Please try again.";
      errorEl.hidden = false;
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Delete Account";
    }
  });

  return { overlay, input };
}

function openDeleteAccountModal() {
  if (!deleteModalEls) deleteModalEls = buildDeleteAccountModal();
  deleteModalEls.overlay.hidden = false;
  deleteModalEls.input.focus();
}

// Re-paints the header avatar on the current page from whatever is in the
// profile hint cache right now. renderAccountLink() normally only runs on
// page load / onAuthStateChanged, so without this the header stays stale
// after an in-page profile edit (e.g. uploading a new photo) until the next
// navigation or refresh re-triggers one of those.
function refreshHeaderAvatar() {
  const accountLink = document.querySelector(".header-actions__account");
  if (!accountLink || accountLink.hidden) return;
  const profile = getProfileHint();
  renderAccountLink(accountLink, profile, profile && profile.email);
}

function wireHeaderButtons() {
  const signInBtn = document.querySelector(".header-actions__signin");
  const signUpBtn = document.querySelector(".header-actions__signup");
  if (!signInBtn || !signUpBtn) return;

  // Render optimistically from the last known state so the header doesn't
  // flash "Sign In" while Firebase resolves the real auth state on each
  // page load. This is just a UI hint, never used for access control.
  const cachedProfile = getProfileHint();
  if (localStorage.getItem(SIGNED_IN_HINT_KEY) === "1") {
    renderHeaderSignedIn(signInBtn, signUpBtn, cachedProfile, cachedProfile && cachedProfile.email);
  } else {
    renderHeaderSignedOut(signInBtn, signUpBtn);
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      localStorage.setItem(SIGNED_IN_HINT_KEY, "1");
      let profile = getProfileHint();
      // Google sign-in already carries a name/photo on the Firebase user
      // object itself, so use that as a fallback until account.html (or
      // the sign-up flow) caches a proper profile hint.
      if (!profile && (user.displayName || user.photoURL)) {
        profile = { ...splitDisplayName(user.displayName), photoURL: user.photoURL || "", email: user.email || "" };
        setProfileHint(profile);
      }
      renderHeaderSignedIn(signInBtn, signUpBtn, profile, user.email);
    } else {
      localStorage.removeItem(SIGNED_IN_HINT_KEY);
      clearProfileHint();
      renderHeaderSignedOut(signInBtn, signUpBtn);
    }
    renderHeroCta(user);
  });
}

wireHeaderButtons();

// Sitewide auth-gate for nav links (e.g. Achievements) and any other
// .js-auth-gate links a page adds — redirects a signed-out click to sign in,
// then back to the originally-requested page. Resolves the link's href
// through the URL API (not string concatenation) so it works the same from
// pages nested in a subdirectory, e.g. quizzes/the-refrigeration-cycle.html.
function wireAuthGateLinks() {
  const gated = document.querySelectorAll(".js-auth-gate");
  if (!gated.length) return;
  let signedIn = localStorage.getItem(SIGNED_IN_HINT_KEY) === "1";
  onAuthStateChanged(auth, (user) => {
    signedIn = !!user;
  });
  gated.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (signedIn) return;
      event.preventDefault();
      const target = new URL(link.getAttribute("href"), window.location.href);
      const next = safeNextPath(target.pathname);
      window.location.href = `/login.html#next=${encodeURIComponent(next)}`;
    });
  });
}

wireAuthGateLinks();

// Announcements bell — signed-in users only. Read state is tracked per user
// in Firestore (users/{uid}/meta/announcements -> { readIds: [...] }) so
// posting an announcement is just adding an entry to announcements-data.js;
// no admin UI or extra Firestore rules needed (the existing per-uid
// subcollection rule already covers this doc).
function buildAnnouncementsBell() {
  const container = document.querySelector(".header-actions");
  if (!container) return null;

  const bellBtn = document.createElement("button");
  bellBtn.type = "button";
  bellBtn.className = "header-actions__bell";
  bellBtn.setAttribute("aria-label", "Announcements");
  bellBtn.setAttribute("aria-expanded", "false");
  bellBtn.hidden = true;
  bellBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
    <span class="header-actions__bell-badge" hidden></span>
  `;

  const panel = document.createElement("div");
  panel.className = "tb-announcements-panel";
  panel.innerHTML = `
    <div class="tb-announcements-panel__header">Announcements</div>
    <div class="tb-announcements-panel__list"></div>
  `;

  container.appendChild(bellBtn);
  container.appendChild(panel);

  const setOpen = (open) => {
    panel.classList.toggle("is-open", open);
    bellBtn.setAttribute("aria-expanded", String(open));
  };

  // Clicking the bell's icon/badge makes e.target a child of bellBtn rather
  // than bellBtn itself, so the outside-click check below must use
  // .contains() — a strict !== comparison closes the panel on the same
  // click that opened it.
  bellBtn.addEventListener("click", () => {
    setOpen(!panel.classList.contains("is-open"));
  });

  document.addEventListener("click", (e) => {
    if (panel.classList.contains("is-open") && !panel.contains(e.target) && !bellBtn.contains(e.target)) {
      setOpen(false);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) setOpen(false);
  });

  return { bellBtn, panel, badge: bellBtn.querySelector(".header-actions__bell-badge"), setOpen };
}

async function loadAnnouncementReadIds() {
  const user = auth.currentUser;
  if (!user) return [];
  try {
    const snap = await getDoc(doc(db, "users", user.uid, "meta", "announcements"));
    return (snap.exists() && snap.data().readIds) || [];
  } catch (e) {
    return [];
  }
}

async function markAnnouncementRead(id, badge) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const ref = doc(db, "users", user.uid, "meta", "announcements");
    const snap = await getDoc(ref);
    const existing = (snap.exists() && snap.data().readIds) || [];
    if (existing.includes(id)) return;
    await setDoc(ref, { readIds: [...existing, id], updatedAt: serverTimestamp() }, { merge: true });
  } catch (e) {}
  if (badge) {
    const remaining = Math.max(0, parseInt(badge.textContent || "0", 10) - 1);
    if (remaining > 0) {
      badge.textContent = String(remaining);
    } else {
      badge.hidden = true;
    }
  }
}

function renderAnnouncementsList(panel, readIds, badge) {
  const listEl = panel.querySelector(".tb-announcements-panel__list");
  listEl.textContent = "";

  if (!ANNOUNCEMENTS.length) {
    const empty = document.createElement("p");
    empty.className = "tb-announcements-panel__empty";
    empty.textContent = "No announcements yet.";
    listEl.appendChild(empty);
    return;
  }

  ANNOUNCEMENTS.forEach((a) => {
    const isUnread = !readIds.includes(a.id);
    const item = document.createElement("a");
    item.className = "tb-announcements-panel__item" + (isUnread ? " is-unread" : "");
    item.href = a.url;
    item.addEventListener("click", () => markAnnouncementRead(a.id, badge));

    const title = document.createElement("span");
    title.className = "tb-announcements-panel__item-title";
    title.textContent = a.title;
    const date = document.createElement("span");
    date.className = "tb-announcements-panel__item-date";
    date.textContent = a.date;

    item.appendChild(title);
    item.appendChild(date);
    listEl.appendChild(item);
  });
}

function wireAnnouncementsBell() {
  const els = buildAnnouncementsBell();
  if (!els) return;
  const { bellBtn, panel, badge, setOpen } = els;

  onAuthStateChanged(auth, (user) => {
    bellBtn.hidden = !user;
    if (!user) {
      setOpen(false);
      badge.hidden = true;
      return;
    }
    loadAnnouncementReadIds().then((readIds) => {
      renderAnnouncementsList(panel, readIds, badge);
      const unread = ANNOUNCEMENTS.filter((a) => !readIds.includes(a.id)).length;
      badge.textContent = unread > 0 ? String(unread) : "";
      badge.hidden = unread === 0;
    });
  });
}

wireAnnouncementsBell();

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
    await authReadyPromise;
    const ref = cloudDocRef(kind, pageId);
    if (!ref) return;
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
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
  db,
  storage,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  storageRef,
  uploadBytes,
  getDownloadURL,
  listAll,
  deleteObject,
  startSession,
  ensureUserProfile,
  endSession,
  signOutEverywhere,
  deleteAccountEverywhere,
  clearLocalUserCaches,
  openDeleteAccountModal,
  safeNextPath,
  getProfileHint,
  setProfileHint,
  clearProfileHint,
  refreshHeaderAvatar,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
};
