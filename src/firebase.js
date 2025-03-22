import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = { 
  apiKey: "AIzaSyAy6yZ57_CBJuykKI68s53TVq14OzvamMU",
  authDomain: "evolvex-2c7d7.firebaseapp.com",
  databaseURL: "https://evolvex-2c7d7-default-rtdb.firebaseio.com",
  projectId: "evolvex-2c7d7",
  storageBucket: "evolvex-2c7d7.firebasestorage.app",
  messagingSenderId: "287465961401",
  appId: "1:287465961401:web:0269fcbac215fd317fa868",
  measurementId: "G-MWWS90DGPR",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
