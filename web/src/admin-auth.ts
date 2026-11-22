/** Google sign-in for the admin dashboard. Separate from the phone-OTP Firebase instance. */
import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserSessionPersistence,
  initializeAuth,
  browserPopupRedirectResolver,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

const app = initializeApp(
  {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  },
  "admin",
);
const auth = initializeAuth(app, {
  persistence: browserSessionPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});

export const onUser = (cb: (user: User | null) => void) => onAuthStateChanged(auth, cb);

export async function signIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(auth, provider);
}

export const signOutAdmin = () => signOut(auth);

/** Fresh ID token (Firebase refreshes it automatically when it is close to expiry). */
export async function token(): Promise<string> {
  if (!auth.currentUser) throw new Error("Please sign in.");
  return auth.currentUser.getIdToken();
}
