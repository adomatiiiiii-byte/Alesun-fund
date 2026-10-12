const DATABASE_NAME = "alesun-applicant-drafts";
const DATABASE_VERSION = 1;
const STORE_NAME = "drafts";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("userKey", "userKey", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction(mode, handler) {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);

        transaction.oncomplete = () => {
          database.close();
        };
        transaction.onerror = () => reject(transaction.error);

        handler(store, resolve, reject);
      })
  );
}

export function listApplicantDrafts(userKey) {
  return runTransaction("readonly", (store, resolve, reject) => {
    const index = store.index("userKey");
    const request = index.getAll(userKey);

    request.onsuccess = () => {
      const drafts = request.result.sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
      resolve(drafts);
    };
    request.onerror = () => reject(request.error);
  });
}

export function saveApplicantDraft(draft) {
  return runTransaction("readwrite", (store, resolve, reject) => {
    const request = store.put(draft);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function deleteApplicantDraft(id) {
  return runTransaction("readwrite", (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
