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
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email) {
    alert("L'email est requis");
    return;
  }
  if (!password) {
    alert("Le mot de passe est requis");
    return;
  }
  if (password.length < 6) {
    alert("Le mot de passe doit contenir au moins 6 caractères");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert('Inscription réussie !');
  } catch (error) {
    alert('Erreur : ' + error.message);
    console.error(error);
  }
});

loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert('Email et mot de passe requis pour la connexion');
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert('Connexion réussie !');
  } catch (error) {
    alert('Erreur : ' + error.message);
    console.error(error);
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    alert('Déconnecté');
  } catch (error) {
    alert('Erreur lors de la déconnexion : ' + error.message);
    console.error(error);
  }
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
