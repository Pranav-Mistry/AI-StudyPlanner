import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
// Replace these values with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyBPtVuv_uQmbmvk1whiFvczoJyJLojhRWo",
  authDomain: "ai-study-planner-ad07a.firebaseapp.com",
  projectId: "ai-study-planner-ad07a",
  storageBucket: "ai-study-planner-ad07a.firebasestorage.app",
  messagingSenderId: "957753495405",
  appId: "1:957753495405:web:cff075ae35d3c974e89464"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
