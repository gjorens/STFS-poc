import { firebaseConfig, isDemo } from "./config.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.2";
const MAX_BYTES = 900000; // Firestore documents are capped at 1 MiB; keep headroom
const $ = (id) => document.getElementById(id);
const encoder = new TextEncoder();
const byteLen = (s) => encoder.encode(s).length;
const ms = (d) => (d.updatedAt && d.updatedAt.toMillis ? d.updatedAt.toMillis() : d.updatedAt || Date.now());

const state = {
  docs: [],
  currentId: null,
  dirty: false,
  timer: null,
  store: null,
  stopListening: null,
};

function deviceName() {
  const ua = navigator.userAgent;
  const ipadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1; // iPadOS reports as Mac
  if (/iPad/.test(ua) || ipadOS) return "iPad";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Android/.test(ua)) return "Android";
  return "Browser";
}
const DEVICE = deviceName();

/* ---------- Demo store: same interface as the Firestore store, kept in localStorage ---------- */
function demoStore() {
  const KEY = "stfb-poc-demo-docs";
  const subs = new Set();
  const read = () => JSON.parse(localStorage.getItem(KEY) || "[]");
  const emit = () => subs.forEach((cb) => cb(read(), false));
  return {
    listen(cb) {
      subs.add(cb);
      cb(read(), false);
      return () => subs.delete(cb);
    },
    async save(d) {
      const all = read();
      const rec = { id: d.id, title: d.title, body: d.body, device: DEVICE, updatedAt: Date.now() };
      const i = all.findIndex((x) => x.id === d.id);
      if (i >= 0) all[i] = rec; else all.push(rec);
      localStorage.setItem(KEY, JSON.stringify(all));
      emit();
    },
  };
}

/* ---------- Screens ---------- */
function showSignin() {
  state.stopListening?.();
  state.stopListening = null;
  state.currentId = null;
  state.docs = [];
  $("signin").hidden = false;
  $("app").hidden = true;
  $("signout").hidden = true;
  $("who").textContent = "";
}

function start(user, store) {
  state.store = store;
  $("signin").hidden = true;
  $("app").hidden = false;
  $("who").textContent = user.displayName || user.email || "Signed in";
  $("signout").hidden = isDemo;
  state.stopListening?.();
  state.stopListening = store.listen(onDocs);
}

/* ---------- Data flow ---------- */
function onDocs(raw, fromCache) {
  state.docs = raw.sort((a, b) => ms(b) - ms(a));
  renderList();
  if (!state.currentId && state.docs.length) {
    openDoc(state.docs[0].id);
  } else if (!state.currentId && !fromCache) {
    newDoc(); // first run on a new account, confirmed by the server
  } else if (!state.dirty) {
    loadEditor(); // pull in changes made on another device
  }
  updateSyncStatus();
}

function renderList() {
  const ul = $("list");
  ul.textContent = "";
  for (const d of state.docs) {
    const li = document.createElement("li");
    li.textContent = (d.title || "Untitled") + (d.pending ? " · syncing" : "");
    if (d.id === state.currentId) li.className = "active";
    li.onclick = () => openDoc(d.id);
    ul.appendChild(li);
  }
}

function loadEditor() {
  const d = state.docs.find((x) => x.id === state.currentId);
  if (!d) return;
  $("title").value = d.title || "";
  $("body").value = d.body || "";
}

async function openDoc(id) {
  if (state.dirty) saveNow();
  state.currentId = id;
  state.dirty = false;
  loadEditor();
  renderList();
  updateSyncStatus();
}

function newDoc() {
  if (state.dirty) saveNow();
  state.currentId = crypto.randomUUID();
  $("title").value = "";
  $("body").value = "";
  state.dirty = false;
  saveNow(); // creates the document on this device straight away
  $("title").focus();
}

function onEdit() {
  state.dirty = true;
  setStatus("Editing…");
  clearTimeout(state.timer);
  state.timer = setTimeout(saveNow, 1000); // autosave after a short pause
}

function saveNow() {
  clearTimeout(state.timer);
  if (!state.currentId || !state.store) return;
  const d = { id: state.currentId, title: $("title").value.trim(), body: $("body").value };
  if (byteLen(d.title) + byteLen(d.body) > MAX_BYTES) {
    setStatus("Too large to save (over 1 MB). Not saved.");
    return;
  }
  state.dirty = false;
  state.store.save(d).catch((e) => {
    console.error(e);
    setStatus("Save failed. Will retry when online.");
  });
  setStatus(navigator.onLine ? "Saving…" : "Saved on this device · will sync when online");
}

/* ---------- Status ---------- */
function setStatus(msg) {
  $("saveState").textContent = msg;
}

function setNet() {
  $("net").textContent = navigator.onLine ? "Online" : "Offline";
}

function updateSyncStatus() {
  if (state.dirty) return; // don't overwrite "Editing…"
  const pending = state.docs.some((d) => d.pending);
  if (pending) setStatus("Syncing…");
  else if (navigator.onLine) setStatus("All changes saved");
  else setStatus("Saved on this device · will sync when online");
}

/* ---------- Boot ---------- */
async function boot() {
  setNet();
  window.addEventListener("online", () => { setNet(); updateSyncStatus(); });
  window.addEventListener("offline", () => { setNet(); updateSyncStatus(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.dirty) saveNow(); // iOS can suspend the app at any time
  });

  $("newBtn").onclick = newDoc;
  $("saveBtn").onclick = saveNow;
  $("title").oninput = onEdit;
  $("body").oninput = onEdit;

  if (isDemo) {
    $("demoBanner").hidden = false;
    start({ displayName: "Demo" }, demoStore());
    return;
  }

  const { initializeApp } = await import(`${FB}/firebase-app.js`);
  const { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } =
    await import(`${FB}/firebase-auth.js`);

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  // Redirect sign-in is more reliable than pop-ups on iPhone, iPad and home-screen apps.
  $("signinBtn").onclick = () => signInWithRedirect(auth, new GoogleAuthProvider());
  $("signout").onclick = () => signOut(auth);

  try {
    await getRedirectResult(auth);
  } catch (e) {
    console.error(e);
    setStatus("Sign-in failed: " + e.message);
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) return showSignin();
    const { createFirestoreStore } = await import("./store-firestore.js");
    start(user, createFirestoreStore(app, user.uid, DEVICE));
  });
}

boot();
