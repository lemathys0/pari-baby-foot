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
  onSnapshot,
  updateDoc,
  doc,
  arrayUnion,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// --- Auth elements ---
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authDiv = document.getElementById('auth');

// --- Bet elements ---
const betSection = document.getElementById('bet-section');
const team1Input = document.getElementById('team1');
const team2Input = document.getElementById('team2');
const addMatchBtn = document.getElementById('addMatchBtn');
const matchesList = document.getElementById('matches-list');

let currentUser = null;

// Inscription, Connexion, Déconnexion (comme avant)...
// Je peux te remettre si besoin mais tu as déjà le code plus haut

registerBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password || password.length < 6) return alert("Email et mot de passe (6+) requis");
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Inscription réussie");
  } catch (e) { alert("Erreur: "+e.message); }
});

loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return alert("Email et mot de passe requis");
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Connexion réussie");
  } catch (e) { alert("Erreur: "+e.message); }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    alert("Déconnecté");
  } catch (e) { alert("Erreur: "+e.message); }
});

// Écoute la connexion/déconnexion
onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    authDiv.style.display = 'none';
    betSection.style.display = 'block';
    startListeningMatches();
  } else {
    authDiv.style.display = 'block';
    betSection.style.display = 'none';
    stopListeningMatches();
  }
});

let unsubscribeMatches = null;

function startListeningMatches() {
  const matchesCol = collection(db, 'matches');
  unsubscribeMatches = onSnapshot(matchesCol, (snapshot) => {
    matchesList.innerHTML = ''; // reset
    snapshot.forEach(docSnap => {
      const match = docSnap.data();
      const id = docSnap.id;
      const li = document.createElement('li');
      li.style.border = '1px solid #FF6F61';
      li.style.borderRadius = '10px';
      li.style.padding = '10px';
      li.style.marginBottom = '10px';

      let betsHtml = '<ul>';
      if(match.bets && match.bets.length) {
        for(const bet of match.bets) {
          betsHtml += `<li>${bet.prediction} — ${bet.stake} points</li>`;
        }
      } else {
        betsHtml += '<li>Aucun pari</li>';
      }
      betsHtml += '</ul>';

      li.innerHTML = `
        <strong>${match.team1} vs ${match.team2}</strong>
        ${betsHtml}
        <input type="text" placeholder="Ton pari (équipe gagnante)" id="prediction-${id}" />
        <input type="number" placeholder="Points" min="1" id="stake-${id}" />
        <button id="betBtn-${id}">Parier</button>
      `;

      matchesList.appendChild(li);

      document.getElementById(`betBtn-${id}`).onclick = async () => {
        const prediction = document.getElementById(`prediction-${id}`).value.trim();
        const stake = parseInt(document.getElementById(`stake-${id}`).value, 10);
        if (!prediction) return alert("Entre ton pari");
        if (!stake || stake <= 0) return alert("Entre un nombre de points valide");
        if (!currentUser) return alert("Tu dois être connecté");

        try {
          const matchRef = doc(db, 'matches', id);
          await updateDoc(matchRef, {
            bets: arrayUnion({
              userId: currentUser.uid,
              prediction,
              stake
            })
          });
          alert('Pari placé !');
          // Nettoyer les champs
          document.getElementById(`prediction-${id}`).value = '';
          document.getElementById(`stake-${id}`).value = '';
        } catch (e) {
          alert('Erreur lors du pari : ' + e.message);
          console.error(e);
        }
      };
    });
  });
}

function stopListeningMatches() {
  if (unsubscribeMatches) unsubscribeMatches();
}

// Ajouter un match
addMatchBtn.addEventListener('click', async () => {
  const team1 = team1Input.value.trim();
  const team2 = team2Input.value.trim();

  if (!team1 || !team2) return alert('Entrez les deux équipes');

  try {
    await addDoc(collection(db, 'matches'), {
      team1,
      team2,
      bets: []
    });
    alert('Match ajouté !');
    team1Input.value = '';
    team2Input.value = '';
  } catch (e) {
    alert('Erreur ajout match : ' + e.message);
  }
});
