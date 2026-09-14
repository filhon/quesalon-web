"use client";

import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "./firebase";
import { writeLocal } from "./local-storage";

export async function signOut(): Promise<void> {
  // Clear the HttpOnly session cookie server-side
  await fetch("/api/auth/session", { method: "DELETE" });

  await firebaseSignOut(auth);

  // a escolha de fonte (SIEG / Emite Aí) vale só durante o acesso
  writeLocal("nfe-source-pref", null);

  window.location.href = "/login";
}
