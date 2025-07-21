import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import Firestore

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBX0MRmIgOP3Y2Dq0dtjsU3T-mJ_E_Pcto",
  authDomain: "costing-78766.firebaseapp.com",
  projectId: "costing-78766",
  storageBucket: "costing-78766.appspot.com", // Fixed incorrect URL
  messagingSenderId: "1084358674921",
  appId: "1:1084358674921:web:cba52af00a304d860e2378"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Auth & Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Export
export { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword };
