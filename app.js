import {
  auth,
  db
} from './firebase-config.js';

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
  doc,
  setDoc,
  updateDoc,
  getDoc,
  arrayUnion,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

const userPointsDisplay = document.getElementById('userPoints');
const pointsValue = document.getElementById('pointsValue');

const matchesSection = document.getElementById('matches-section');
const matchesList = document.getElementById('matches-list');
const addMatchBtn = document.getElementById('addMatchBtn');
const team1Input = document.getElementById('team1');
const team2Input = document.getElementById('team2');

let currentUser = null;
let currentUserData = null;

// Remplace par l'UID de l'admin de ton projet Firebase
const ADMIN_UID = 'TON_UID_ADMIN_ICI';

// Inscription
registerBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) return alert('Email et mot de passe requis');
  if (password.length < 6) return alert('Mot de passe doit faire au moins 6 caractères');

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;

    // Créer profil utilisateur dans Firestore avec 50 points initiaux
    await setDoc(doc(db, 'users', currentUser.uid), {
      email,
      points: 50,
      isAdmin: false
    });

    alert("Inscription réussie, tu as 50 points !");
    emailInput.value = '';
    passwordInput.value = '';
  } catch (error) {
    alert("Erreur inscription : " + error.message);
  }
};

// Connexion
loginBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) return alert('Email et mot de passe requis');

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    emailInput.value = '';
    passwordInput.value = '';
  } catch (error) {
    alert("Erreur connexion : " + error.message);
  }
};

// Déconnexion
logoutBtn.onclick = async () => {
  await signOut(auth);
};

// Sur changement d’authentification
onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (user) {
    // Récupérer données user Firestore
    const docSnap = await getDoc(doc(db, 'users', user.uid));
    currentUserData = docSnap.exists() ? docSnap.data() : null;

    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    userPointsDisplay.style.display = 'block';
    pointsValue.textContent = currentUserData?.points ?? 0;
    matchesSection.style.display = 'block';

    listenMatches();
  } else {
    loginBtn.style.display = 'inline-block';
    registerBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    userPointsDisplay.style.display = 'none';
    matchesSection.style.display = 'none';
    matchesList.innerHTML = '';
    currentUserData = null;
  }
});

// Ajouter un match (admin)
addMatchBtn.onclick = async () => {
  if (!currentUser || currentUser.uid !== ADMIN_UID) {
    return alert("Seul l'admin peut ajouter un match.");
  }

  const team1 = team1Input.value.trim();
  const team2 = team2Input.value.trim();

  if (!team1 || !team2) return alert('Les deux équipes sont requises');

  try {
    await addDoc(collection(db, 'matches'), {
      team1,
      team2,
      bets: [],
      closed: false,
      winner: null,
      createdAt: new Date()
    });

    team1Input.value = '';
    team2Input.value = '';
  } catch (error) {
    alert('Erreur ajout match : ' + error.message);
  }
};

// Écoute les matchs en temps réel
function listenMatches() {
  const q = query(collection(db, 'matches'));
  onSnapshot(q, snapshot => {
    matchesList.innerHTML = '';

    snapshot.forEach(docSnap => {
      const match = docSnap.data();
      const id = docSnap.id;

      const li = document.createElement('li');

      let betsHtml = '';
      if (match.bets?.length > 0) {
        betsHtml = '<div class="bet-item"><strong>Paris:</strong><ul>';
        match.bets.forEach(bet => {
          betsHtml += `<li>${bet.prediction} - ${bet.stake} pts</li>`;
        });
        betsHtml += '</ul></div>';
      }

      // Si match clôturé, afficher résultat
      if(match.closed){
        li.innerHTML = `
          <strong>${match.team1} vs ${match.team2}</strong> - <em>Match terminé, gagnant : ${match.winner}</em>
          ${betsHtml}
        `;
      } else {
        // Match ouvert: afficher formulaire pari

        li.innerHTML = `
          <strong>${match.team1} vs ${match.team2}</strong>
          ${betsHtml}
          <select id="prediction-${id}">
            <option value="" disabled selected>Choisis l'équipe gagnante</option>
            <option value="${match.team1}">${match.team1}</option>
            <option value="${match.team2}">${match.team2}</option>
          </select>
          <input type="number" id="stake-${id}" placeholder="Points à miser" min="1" max="${currentUserData.points}" />
          <button id="betBtn-${id}">Parier</button>
        `;

        // Parier
        document.getElementById(`betBtn-${id}`).onclick = async () => {
          if (!currentUser) return alert("Connecte-toi d'abord");

          const predictionEl = document.getElementById(`prediction-${id}`);
          const stakeEl = document.getElementById(`stake-${id}`);

          const prediction = predictionEl.value;
          const stake = parseInt(stakeEl.value, 10);

          if (!prediction) return alert("Choisis une équipe");
          if (!stake || stake <= 0) return alert("Points invalides");
          if (stake > currentUserData.points) return alert("Tu n'as pas assez de points");

          try {
            // Deduct points user
            await updateDoc(doc(db, 'users', currentUser.uid), {
              points: currentUserData.points - stake
            });

            // Update local user data points
            currentUserData.points -= stake;
            pointsValue.textContent = currentUserData.points;

            // Add bet to match
            await updateDoc(doc(db, 'matches', id), {
              bets: arrayUnion({
                userId: currentUser.uid,
                prediction,
                stake
              })
            });

            alert("Pari placé !");
            predictionEl.value = '';
            stakeEl.value = '';
          } catch (e) {
            alert("Erreur pari : " + e.message);
          }
        };
      }

      // Si admin, bouton clôturer match ouvert
      if(currentUser?.uid === ADMIN_UID && !match.closed){
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Clôturer';
        closeBtn.className = 'admin-btn';
        closeBtn.onclick = async () => {
          const winner = prompt(`Qui a gagné ? (${match.team1} ou ${match.team2})`);
          if(winner !== match.team1 && winner !== match.team2) return alert("Choix invalide");

          try {
            await updateDoc(doc(db, 'matches', id), {
              winner,
              closed: true
            });

            // Distribuer les gains
            if(match.bets?.length){
              for(const bet of match.bets){
                if(bet.prediction === winner){
                  const userRef = doc(db, 'users', bet.userId);
                  const userSnap = await getDoc(userRef);
                  if(userSnap.exists()){
                    const data = userSnap.data();
                    await updateDoc(userRef, {
                      points: (data.points || 0) + bet.stake * 2 // double la mise gagnée
                    });

                    // Si l'admin clôture plusieurs matchs, pour rester à jour dans l'UI, 
                    // il faudra reload ou re-fetch les points. Ici, pour la simplicité, on ne le fait pas.
                  }
                }
              }
            }

            alert("Match clôturé et points distribués !");
          } catch (e) {
            alert("Erreur clôture match : " + e.message);
          }
        };
        li.appendChild(closeBtn);
      }

      matchesList.appendChild(li);
    });
  });
}
