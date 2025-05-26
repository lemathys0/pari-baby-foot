import { auth } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const betSection = document.getElementById('bet-section');
const authDiv = document.getElementById('auth');

registerBtn.addEventListener('click', async () => {
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    alert('Inscription réussie');
  } catch (err) {
    alert(err.message);
  }
});

loginBtn.addEventListener('click', async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    alert('Connexion réussie');
  } catch (err) {
    alert(err.message);
  }
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  alert('Déconnecté');
});

onAuthStateChanged(auth, user => {
  if (user) {
    authDiv.style.display = 'none';
    betSection.style.display = 'block';
  } else {
    authDiv.style.display = 'block';
    betSection.style.display = 'none';
  }
});
