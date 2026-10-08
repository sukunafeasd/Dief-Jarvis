export function browserStorage() {
  let database;
  const open = () =>
    (database ||= new Promise((resolve, reject) => {
      const request = indexedDB.open("dief-jarvis-local", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("workspace");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(Error("Nao foi possivel abrir os dados locais."));
      request.onblocked = () =>
        reject(Error("Feche outra aba antiga do Jarvis para abrir os dados."));
    }));
  return {
    async read() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const request = db
          .transaction("workspace")
          .objectStore("workspace")
          .get("current");
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(Error("Falha ao ler os dados locais."));
      });
    },
    async save(revision, state) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("workspace", "readwrite");
        const store = tx.objectStore("workspace");
        let conflict = false;
        const read = store.get("current");
        read.onsuccess = () => {
          if ((read.result?.revision || 0) !== revision) {
            conflict = true;
            tx.abort();
            return;
          }
          store.put(state, "current");
        };
        tx.oncomplete = resolve;
        tx.onabort = () =>
          reject(
            Error(
              conflict
                ? "Dados atualizados em outra janela. Tente novamente."
                : "Falha ao salvar. A acao nao foi confirmada.",
            ),
          );
        tx.onerror = () => {};
      });
    },
  };
}
