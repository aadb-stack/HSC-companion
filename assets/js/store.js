// =============================================================================
//  store.js — one data API, two backends.
//  • CloudBackend  → Firebase Auth + Firestore (cross-device sync)
//  • LocalBackend  → localStorage (works instantly, no setup, this device only)
//  The rest of the app never needs to know which one is active.
// =============================================================================
import { initFirebase } from "./firebase.js";

const LS = window.localStorage;
const genId = () => "id-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function toMillis(v) {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (v.seconds) return v.seconds * 1000;
  const t = Date.parse(v);
  return isNaN(t) ? 0 : t;
}

/* -------------------------------------------------------------------------- */
/*  LOCAL backend                                                             */
/* -------------------------------------------------------------------------- */
class LocalBackend {
  constructor() {
    this.cloud = false;
    let uid = LS.getItem("hsc:uid");
    if (!uid) { uid = genId(); LS.setItem("hsc:uid", uid); }
    this.user = { uid, displayName: LS.getItem("hsc:name") || "Student", isLocal: true };
  }
  _k(name) { return `hsc:${name}:${this.user.uid}`; }
  _read(name, fallback) { try { return JSON.parse(LS.getItem(this._k(name))) ?? fallback; } catch { return fallback; } }
  _write(name, val) { LS.setItem(this._k(name), JSON.stringify(val)); }

  onAuth(cb) { cb(this.user); return () => {}; }
  async signOut() { /* local mode stays signed in */ }
  async setDisplayName(name) { this.user.displayName = name; LS.setItem("hsc:name", name); window.dispatchEvent(new Event("hsc:auth")); }

  async getProfile() { return this._read("profile", {}); }
  async saveProfile(patch) {
    const cur = this._read("profile", {});
    const next = { ...cur, ...patch };
    this._write("profile", next);
    window.dispatchEvent(new CustomEvent("hsc:profile", { detail: next }));
    return next;
  }
  onProfile(cb) {
    const handler = (e) => cb(e.detail);
    window.addEventListener("hsc:profile", handler);
    this.getProfile().then(cb);
    return () => window.removeEventListener("hsc:profile", handler);
  }

  async listFlashcards() { return this._read("flashcards", []); }
  async addFlashcard(card) {
    const list = this._read("flashcards", []);
    const item = { id: genId(), box: 1, createdAt: Date.now(), ...card };
    list.unshift(item); this._write("flashcards", list);
    window.dispatchEvent(new Event("hsc:flashcards"));
    return item;
  }
  async updateFlashcard(id, patch) {
    const list = this._read("flashcards", []).map((c) => (c.id === id ? { ...c, ...patch } : c));
    this._write("flashcards", list); window.dispatchEvent(new Event("hsc:flashcards"));
  }
  async deleteFlashcard(id) {
    this._write("flashcards", this._read("flashcards", []).filter((c) => c.id !== id));
    window.dispatchEvent(new Event("hsc:flashcards"));
  }
  onFlashcards(cb) {
    const handler = () => this.listFlashcards().then(cb);
    window.addEventListener("hsc:flashcards", handler);
    handler();
    return () => window.removeEventListener("hsc:flashcards", handler);
  }

  async listSessions() { return this._read("sessions", []); }
  async addSession(s) {
    const list = this._read("sessions", []);
    list.unshift({ id: genId(), at: Date.now(), ...s });
    this._write("sessions", list.slice(0, 500));
    window.dispatchEvent(new Event("hsc:sessions"));
  }
  onSessions(cb) {
    const handler = () => this.listSessions().then(cb);
    window.addEventListener("hsc:sessions", handler);
    handler();
    return () => window.removeEventListener("hsc:sessions", handler);
  }
}

/* -------------------------------------------------------------------------- */
/*  CLOUD backend (Firebase)                                                  */
/* -------------------------------------------------------------------------- */
class CloudBackend {
  constructor(fb) {
    this.cloud = true;
    this.fb = fb;
    this.user = fb.auth.currentUser;
    this.a = fb.authApi;
    this.d = fb.dbApi;
  }
  _userDoc() { return this.d.doc(this.fb.db, "users", this.user.uid); }
  _col(name) { return this.d.collection(this.fb.db, "users", this.user.uid, name); }

  onAuth(cb) {
    return this.a.onAuthStateChanged(this.fb.auth, (u) => { this.user = u; cb(u); });
  }
  async signInGoogle() {
    const provider = new this.a.GoogleAuthProvider();
    await this.a.signInWithPopup(this.fb.auth, provider);
  }
  async signInEmail(email, pw) { await this.a.signInWithEmailAndPassword(this.fb.auth, email, pw); }
  async signUpEmail(email, pw, name) {
    const cred = await this.a.createUserWithEmailAndPassword(this.fb.auth, email, pw);
    if (name) await this.a.updateProfile(cred.user, { displayName: name });
  }
  async signInGuest() { await this.a.signInAnonymously(this.fb.auth); }
  async signOut() { await this.a.signOut(this.fb.auth); }
  async setDisplayName(name) {
    if (this.user) { await this.a.updateProfile(this.user, { displayName: name }); window.dispatchEvent(new Event("hsc:auth")); }
  }

  async getProfile() {
    const snap = await this.d.getDoc(this._userDoc());
    return snap.exists() ? snap.data() : {};
  }
  async saveProfile(patch) {
    await this.d.setDoc(this._userDoc(), { ...patch, _updatedAt: this.d.serverTimestamp() }, { merge: true });
  }
  onProfile(cb) {
    return this.d.onSnapshot(this._userDoc(), (snap) => cb(snap.exists() ? snap.data() : {}));
  }

  async listFlashcards() {
    const q = this.d.query(this._col("flashcards"), this.d.orderBy("createdAt", "desc"));
    const snap = await this.d.getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  async addFlashcard(card) {
    return this.d.addDoc(this._col("flashcards"), { box: 1, createdAt: this.d.serverTimestamp(), ...card });
  }
  async updateFlashcard(id, patch) {
    await this.d.updateDoc(this.d.doc(this.fb.db, "users", this.user.uid, "flashcards", id), patch);
  }
  async deleteFlashcard(id) {
    await this.d.deleteDoc(this.d.doc(this.fb.db, "users", this.user.uid, "flashcards", id));
  }
  onFlashcards(cb) {
    const q = this.d.query(this._col("flashcards"), this.d.orderBy("createdAt", "desc"));
    return this.d.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }

  async listSessions() {
    const q = this.d.query(this._col("sessions"), this.d.orderBy("at", "desc"), this.d.limit(500));
    const snap = await this.d.getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  async addSession(s) {
    return this.d.addDoc(this._col("sessions"), { at: this.d.serverTimestamp(), ...s });
  }
  onSessions(cb) {
    const q = this.d.query(this._col("sessions"), this.d.orderBy("at", "desc"), this.d.limit(500));
    return this.d.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }
}

/* -------------------------------------------------------------------------- */
/*  Public singleton                                                          */
/* -------------------------------------------------------------------------- */
export const store = {
  backend: null,
  cloud: false,
  get user() { return this.backend?.user || null; },

  async init() {
    const fb = await initFirebase();
    this.backend = fb.enabled ? new CloudBackend(fb) : new LocalBackend();
    this.cloud = this.backend.cloud;
    return this.backend;
  },
};

// Proxy the backend methods onto the singleton for ergonomic calls (store.getProfile()).
const PROXIED = [
  "onAuth", "signInGoogle", "signInEmail", "signUpEmail", "signInGuest", "signOut", "setDisplayName",
  "getProfile", "saveProfile", "onProfile",
  "listFlashcards", "addFlashcard", "updateFlashcard", "deleteFlashcard", "onFlashcards",
  "listSessions", "addSession", "onSessions",
];
for (const m of PROXIED) {
  store[m] = function (...args) {
    if (!this.backend || typeof this.backend[m] !== "function") {
      return Promise.reject(new Error(`Action "${m}" is not available in this mode.`));
    }
    return this.backend[m](...args);
  };
}
