"use client";

import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "./firebase";

export async function signOut(): Promise<void> {
  // Clear the session cookie
  document.cookie = "session=; path=/; max-age=0; SameSite=Lax";

  await firebaseSignOut(auth);

  window.location.href = "/login";
}
