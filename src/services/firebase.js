import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {

  apiKey: "AIzaSyAvfmBTcJ7VXFI0H4cwSx2d2ji1dW__4sg",

  authDomain: "pillpal-d4ad8.firebaseapp.com",

  projectId: "pillpal-d4ad8",

  storageBucket: "pillpal-d4ad8.firebasestorage.app",

  messagingSenderId: "297231012545",

  appId: "1:297231012545:web:117fe83d428c908766fa40",

  measurementId: "G-DR563X5TZP"

};

// ✅ Validate configuration before initialization
if (!firebaseConfig.apiKey) {
  throw new Error('Firebase API Key is missing. Check your .env file.');
}

if (!firebaseConfig.projectId) {
  throw new Error('Firebase Project ID is missing. Check your .env file.');
}

console.log('Firebase Config:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasProjectId: !!firebaseConfig.projectId,
  projectId: firebaseConfig.projectId,
});

// Initialize Firebase app
let app;
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
  } else {
    app = getApp();
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw error;
}

// Initialize Auth
let auth;
try {
  auth = getAuth(app);
} catch (error) {
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
}


// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
export default app;
