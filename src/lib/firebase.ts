
// This file is intentionally left blank or with comments
// as Firebase usage has been removed for localStorage persistence.

/*
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let db: Firestore;

if (typeof window !== 'undefined') { // Ensure Firebase is initialized only on the client-side
  if (getApps().length === 0) {
    if (
        firebaseConfig.apiKey &&
        firebaseConfig.authDomain &&
        firebaseConfig.projectId
    ) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    } else {
        console.warn("Firebase config is missing. Firebase will not be initialized.");
        // @ts-ignore
        app = null; 
        // @ts-ignore
        db = null;
    }
  } else {
    app = getApps()[0]!;
    db = getFirestore(app);
  }
} else {
    // @ts-ignore
    app = null;
    // @ts-ignore
    db = null;
}


export { app, db };
*/
