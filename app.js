import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');

document.querySelector('#registerBtn').addEventListener('click', async () => {
  await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
});

document.querySelector('#loginBtn').addEventListener('click', async () => {
  await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
});

document.querySelector('#logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, user => {
  const betSection = document.getElementById('bet-section');
  const logoutBtn = document.getElementById('logoutBtn');

  if (user) {
    betSection.style.display = 'block';
    logoutBtn.style.display = 'inline';
    loadBets(user.uid);
  } else {
    betSection.style.display = 'none';
    logoutBtn.style.display = 'none';
  }
});

document.querySelector('#placeBetBtn').addEventListener('click', async () => {
  const team1 = document.querySelector('#team1').value;
  const team2 = document.querySelector('#team2').value;
  const prediction = document.querySelector('#prediction').value;
  const stake = parseInt(document.querySelector('#stake').value);

  await addDoc(collection(db, 'bets'), {
    userId: auth.currentUser.uid,
    team1,
    team2,
    prediction,
    stake,
    date: serverTimestamp()
  });

  alert('Pari enregistré !');
  loadBets(auth.currentUser.uid);
});

async function loadBets(userId) {
  const q = query(collection(db, 'bets'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  const history = document.getElementById('bet-history');
  history.innerHTML = '';
  querySnapshot.forEach(doc => {
    const data = doc.data();
    const li = document.createElement('li');
    li.textContent = ${data.team1} vs  ? Tu as parié :  ( pts);
    history.appendChild(li);
  });
}
