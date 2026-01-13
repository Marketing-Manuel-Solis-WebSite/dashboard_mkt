import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAGNjIBoCuv-ARdEgqJbFHIxQ6S4O7xj7E",
  authDomain: "dashboard-mkt-4c615.firebaseapp.com",
  projectId: "dashboard-mkt-4c615",
  storageBucket: "dashboard-mkt-4c615.firebasestorage.app",
  messagingSenderId: "132821553756",
  appId: "1:132821553756:web:6e8bf4be9068b90c474c99",
  measurementId: "G-H4TEWRZ83Q"
};

// Inicializar Firebase (Patrón Singleton para evitar errores en Next.js)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Servicios exportados
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Analytics (solo en cliente)
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  });
}