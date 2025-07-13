// firebase-config.js - Browser-compatible version
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB8cpbYApxMcGI3STSCo_HoZM_hu4lGisQ",
  authDomain: "per-scholas-alumni.firebaseapp.com",
  projectId: "per-scholas-alumni",
  storageBucket: "per-scholas-alumni.firebasestorage.app",
  messagingSenderId: "150606556084",
  appId: "1:150606556084:web:6a9c0ca8ad15daaecae0e1",
  measurementId: "G-6RRKM3ZMN5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;