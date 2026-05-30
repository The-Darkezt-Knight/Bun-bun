import { initializeApp } from "firebase/app";
import { browserLocalPersistence, browserPopupRedirectResolver, initializeAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATTUdpcyW5zqXzj_iES-27FMW7QlT2IRI",
  authDomain: "bun-bun-265c1.firebaseapp.com",
  projectId: "bun-bun-265c1",
  storageBucket: "bun-bun-265c1.firebasestorage.app",
  messagingSenderId: "515587460762",
  appId: "1:515587460762:web:bbac977f892820d9421923"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Keep web auth in localStorage so clearing site data/localStorage signs the user out.
const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});

const db = getFirestore(app);

export { auth, db };
