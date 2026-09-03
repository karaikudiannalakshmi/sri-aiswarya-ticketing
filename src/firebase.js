import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

export function roleEmail(role) {
  return role === 'admin'
    ? import.meta.env.VITE_ADMIN_EMAIL
    : import.meta.env.VITE_OPERATOR_EMAIL
}

// Session-only persistence: signing in stays valid while the browser tab
// is open, but closing the browser (or the tab) requires logging in again.
// This matters on a shared counter device - without it, Firebase's default
// is to remember the login indefinitely, so anyone who later opens the
// same browser would still be signed in as whoever used it last.
export async function loginAs(role, password) {
  const email = roleEmail(role)
  await setPersistence(auth, browserSessionPersistence)
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

export function logout() {
  return firebaseSignOut(auth)
}

export async function fetchMyRole(uid) {
  const snap = await getDoc(doc(db, 'roles', uid))
  return snap.exists() ? snap.data().role : null
}
