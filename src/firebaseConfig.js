// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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
const auth = getAuth(app);
const db = getFirestore(app);