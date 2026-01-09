// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

/**
 * SEGURANÇA E PRIVACIDADE:
 * No Firebase, a apiKey é um identificador público do projeto, não uma senha secreta.
 * A proteção dos dados é feita através das "Regras de Segurança do Firestore" (firestore.rules).
 * 
 * PARA PROTEÇÃO ADICIONAL (RECOMENDADO):
 * 1. Acesse o Console do Google Cloud (console.cloud.google.com).
 * 2. Vá em APIs e Serviços > Credenciais.
 * 3. Edite a chave de API correspondente a este projeto.
 * 4. Em "Restrições de site", adicione o domínio: vsvistorias.vercel.app
 * Isso impedirá que sua cota de API seja usada em sites de terceiros.
 */
const firebaseConfig = {
  apiKey: "AIzaSyDwhB3e0cQiIYIcjQRqN2hCFviv5iVPNO4",
  authDomain: "appvsvistorias1.firebaseapp.com",
  projectId: "appvsvistorias1",
  storageBucket: "appvsvistorias1.firebasestorage.app",
  messagingSenderId: "987443685390",
  appId: "1:987443685390:web:2a222636b79429ef42f45f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Use initializeFirestore with persistentLocalCache to enable offline persistence
// with multi-tab synchronization enabled.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export { db, auth };