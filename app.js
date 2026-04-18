// Minimal PWA scaffold: IndexedDB for sets, service worker for offline,
// plus a few "spike check" indicators so you can verify everything is wired.

const DB_NAME = "workout";
const DB_VERSION = 1;
const STORE = "sets";

// --- IndexedDB helpers ---------------------------------------------------

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("ts", "ts");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function addSet(set) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(set);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function listRecentSets(limit = 20) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const idx = tx.objectStore(STORE).index("ts");
    const results = [];
    // Walk newest-first.
    idx.openCursor(null, "prev").onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    tx.onerror = () => reject(tx.error);
  });
}

// --- UI rendering --------------------------------------------------------

function fmtTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

async function renderHistory() {
  const ul = document.getElementById("history-list");
  ul.innerHTML = "";
  const sets = await listRecentSets();
  if (sets.length === 0) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="meta">No sets logged yet.</span>`;
    ul.appendChild(li);
    return;
  }
  for (const s of sets) {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="exercise">${escapeHtml(s.exercise)}</span>
      <span class="meta">${s.weight} lb × ${s.reps} · ${fmtTime(s.ts)}</span>
    `;
    ul.appendChild(li);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// --- Form wiring ---------------------------------------------------------

document.getElementById("log-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  await addSet({
    exercise: data.exercise.trim(),
    weight: Number(data.weight),
    reps: Number(data.reps),
    ts: Date.now(),
  });
  form.reset();
  form.elements.exercise.focus();
  await renderHistory();
});

// --- Spike checks --------------------------------------------------------

function setCheck(id, ok, label) {
  const el = document.querySelector(`#${id} span`);
  el.textContent = label;
  el.className = ok ? "ok" : "bad";
}

(async function runSpikeChecks() {
  // Manifest: if this runs at all, HTML parsed; assume "yes" for now.
  setCheck("check-pwa", true, "yes");

  // IndexedDB
  setCheck("check-idb", "indexedDB" in window, "indexedDB" in window ? "yes" : "no");

  // Standalone (home-screen install)
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  setCheck("check-standalone", standalone, standalone ? "yes" : "no (open in Safari, tap Share → Add to Home Screen)");

  // Service worker
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.register("./service-worker.js");
      const active = !!(reg.active || reg.installing || reg.waiting);
      setCheck("check-sw", active, active ? "yes" : "registering…");
      document.getElementById("status").textContent = "ready";
    } catch (err) {
      setCheck("check-sw", false, "error: " + err.message);
      document.getElementById("status").textContent = "sw error";
    }
  } else {
    setCheck("check-sw", false, "unsupported");
    document.getElementById("status").textContent = "no sw support";
  }

  await renderHistory();
})();
