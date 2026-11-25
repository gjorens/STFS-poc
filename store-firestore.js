import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firestore store for one signed-in user. Documents live at users/{uid}/docs/{docId}.
export function createFirestoreStore(app, uid, device) {
  let db;
  try {
    // Offline cache: reads and writes work without a network and sync when back online.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (e) {
    // Happens if Firestore was already initialised, or persistence is unavailable.
    console.warn("Offline cache unavailable, using online-only mode", e);
    db = getFirestore(app);
  }

  const col = collection(db, "users", uid, "docs");

  return {
    listen(cb) {
      return onSnapshot(
        col,
        { includeMetadataChanges: true },
        (snap) => {
          const docs = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            pending: d.metadata.hasPendingWrites,
          }));
          cb(docs, snap.metadata.fromCache);
        },
        (err) => console.error("Firestore listen failed", err)
      );
    },
    // Resolves when the server confirms. Offline, the local cache already holds the change
    // and the promise resolves after reconnecting.
    save(d) {
      return setDoc(
        doc(col, d.id),
        { title: d.title, body: d.body, device, updatedAt: serverTimestamp() },
        { merge: true }
      );
    },
  };
}
