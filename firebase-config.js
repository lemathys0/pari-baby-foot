import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAuDPeIRSw7fGZMjmHK2NkK0rMa33OHcTU',
  authDomain: 'baby-foot-pari.firebaseapp.com',
  projectId: 'baby-foot-pari',
  storageBucket: 'baby-foot-pari.appspot.com',
  messagingSenderId: '93200263187',
  appId: '1:93200263187:web:f611e4ed5bf766f328f7e6',
  measurementId: 'G-857NS0EHF9'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
