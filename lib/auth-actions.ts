"use client";

import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "./firebase";

export async function signOut(): Promise<void> {
  // Clear the HttpOnly session cookie server-side
  await fetch("/api/auth/session", { method: "DELETE" });

  await firebaseSignOut(auth);

  window.location.href = "/login";
}
