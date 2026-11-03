// Inicialização do Firebase (SDK web modular via CDN, sem build).
import "../site-config.js";
import { firebaseConfig } from "../firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence,
  browserPopupRedirectResolver, onAuthStateChanged, connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  memoryLocalCache, connectFirestoreEmulator
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

export const SITE = self.SITE_CONFIG;
export const app = initializeApp(firebaseConfig);

// Mantém a pessoa conectada no celular (persistência local).
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver
});
auth.languageCode = "pt-BR";

// Emulador local (somente para testes em localhost: abra qualquer página com ?emulador=1).
const local = ["localhost", "127.0.0.1"].includes(location.hostname);
if (local && new URLSearchParams(location.search).has("emulador")) sessionStorage.setItem("emulador", "1");
export const usandoEmulador = local && sessionStorage.getItem("emulador") === "1";
if (usandoEmulador) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

/** Primeiro estado de autenticação conhecido (resolve uma vez). */
export const authPronto = new Promise((resolve) => {
  const off = onAuthStateChanged(auth, (u) => { off(); resolve(u); });
});

let _db = null;
/**
 * Firestore. Cache offline (IndexedDB) somente para quem está logado,
 * conforme a regra de proteção dos textos bíblicos. Visitantes usam cache em memória.
 */
export async function getDb() {
  if (_db) return _db;
  const user = await authPronto;
  _db = initializeFirestore(app, {
    localCache: user
      ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      : memoryLocalCache(),
    ignoreUndefinedProperties: true
  });
  if (usandoEmulador) connectFirestoreEmulator(_db, "127.0.0.1", 8080);
  return _db;
}
