/* Baseline — IndexedDB wrapper. Promise-based, one object per row. */
const DB = (() => {
  const NAME = "baseline-db";
  const VERSION = 2;
  const STORES = ["weights", "checkins", "wins", "sessions", "mealweek", "meallog", "kv"];
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        const defs = {
          weights: { keyPath: "date" },
          checkins: { keyPath: "date" },
          wins: { keyPath: "id", autoIncrement: true },
          sessions: { keyPath: "id", autoIncrement: true },
          mealweek: { keyPath: "weekOf" },
          meallog: { keyPath: "id", autoIncrement: true },
          kv: { keyPath: "key" },
        };
        for (const [name, opts] of Object.entries(defs)) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, opts);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function wrap(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return {
    stores: STORES,
    async get(store, key) {
      const db = await open();
      return wrap(db.transaction(store).objectStore(store).get(key));
    },
    async all(store) {
      const db = await open();
      return wrap(db.transaction(store).objectStore(store).getAll());
    },
    async put(store, value) {
      const db = await open();
      return wrap(db.transaction(store, "readwrite").objectStore(store).put(value));
    },
    async del(store, key) {
      const db = await open();
      return wrap(db.transaction(store, "readwrite").objectStore(store).delete(key));
    },
    async clear(store) {
      const db = await open();
      return wrap(db.transaction(store, "readwrite").objectStore(store).clear());
    },
    async exportAll() {
      const out = { app: "baseline", version: VERSION, exported: new Date().toISOString(), data: {} };
      for (const s of STORES) out.data[s] = await this.all(s);
      return out;
    },
    async importAll(payload, { replace = false } = {}) {
      if (!payload || !payload.data) throw new Error("Not a Baseline backup file");
      let n = 0;
      for (const s of STORES) {
        const rows = payload.data[s] || [];
        if (replace) await this.clear(s);
        for (const row of rows) { await this.put(s, row); n++; }
      }
      return n;
    },
    async wipe() {
      for (const s of STORES) await this.clear(s);
    },
  };
})();
