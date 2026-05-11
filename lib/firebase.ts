import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "login-quesalon.firebaseapp.com",
  databaseURL: "https://login-quesalon-default-rtdb.firebaseio.com",
  projectId: "login-quesalon",
  storageBucket: "login-quesalon.appspot.com",
  messagingSenderId: "696199230846",
  appId: "1:696199230846:web:bc3f35fced322a416d2f2f",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
