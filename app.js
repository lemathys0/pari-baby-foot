import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { auth, db } from './firebase-config.js';

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authDiv = document.getElementById('auth');

const matchesSection = document.getElementById('matches-section');
const profileSection = document.getElementById('profile-section');
const rankingSection = document.getElementById('leaderboard-section');
const historySection = document.getElementById('history-section');

const menuMatchesBtn = document.getElementById('menuMatchesBtn');
const menuProfileBtn = document.getElementById('menuProfileBtn');
const menuLeaderboardBtn = document.getElementById('menuLeaderboardBtn');
const menuHistoryBtn = document.getElementById('menuHistoryBtn');

const team1Input = document.getElementById('team1');
const team2Input = document.getElementById('team2');
const oddsInput = document.getElementById('odds');
const addMatchBtn = document.getElementById('addMatchBtn');
const matchesList = document.getElementById('matches-list');

const addMatchDiv = document.getElementById('addMatchDiv');

const profileEmail = document.getElementById('profileEmail');
const profilePoints = document.getElementById('profilePoints');
const rankingList = document.getElementById('ranking-list');
const historyList = document.getElementById('history-list');

let currentUser = null;
let currentUserData = null;

function showSection(section) {
  // Cacher toutes les sections
  matchesSection.style.display = 'none';
  profileSection.style.display = 'none';
  rankingSection.style.display = 'none';
  historySection.style.display = 'none';

  // Supprimer active de tous les boutons
  [menuMatchesBtn, menuProfileBtn, menuLeaderboardBtn, menuHistoryBtn].forEach(btn => btn.classList.remove('active'));

  // Afficher celle demandée
  section.style.display = 'block';

  // Ajouter active au bouton correspondant
  if (section === matchesSection) menuMatchesBtn.classList.add('active');
  else if (section === profileSection) menuProfileBtn.classList.add('active');
  else if (section === rankingSection) menuLeaderboardBtn.classList.add('active');
  else if (section === historySection) menuHistoryBtn.classList.add('active');
}

menuMatchesBtn.addEventListener('click', () => showSection(matchesSection));
menuProfileBtn.addEventListener('click', () => showSection(profileSection));
menuLeaderboardBtn.addEventListener('click', () => {
  showSection(rankingSection);
  updateRanking();
});
menuHistoryBtn.addEventListener('click', () => {
  showSection(historySection);
  listenHistoryMatches();
});

registerBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) {
    alert("Email et mot de passe requis.");
    return;
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const isFirstUser = usersSnapshot.empty;

    await setDoc(doc(db, 'users', uid), {
      email,
      points: 50,
      isAdmin: isFirstUser
    });
    alert('Inscription réussie !');
  } catch (error) {
    alert('Erreur: ' + error.message);
  }
});

loginBtn.addEventListener('click', async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value.trim());
  } catch (error) {
    alert('Erreur: ' + error.message);
  }
});

logoutBtn.addEventListener('click', () => signOut(auth));

addMatchBtn.addEventListener('click', async () => {
  if (!currentUserData?.isAdmin) {
    alert("Vous devez être admin pour ajouter un match.");
    return;
  }

  const team1 = team1Input.value.trim();
  const team2 = team2Input.value.trim();
  const odds = parseFloat(oddsInput.value);
  if (!team1 || !team2 || !odds || odds < 1) {
    alert("Merci de renseigner deux équipes et une cote valide (>= 1).");
    return;
  }

  try {
    await addDoc(collection(db, 'matches'), {
      team1,
      team2,
      odds,
      status: 'open',
      bets: []
    });
    team1Input.value = '';
    team2Input.value = '';
    oddsInput.value = '';
  } catch (error) {
    alert("Erreur lors de l'ajout du match : " + error.message);
  }
});

function renderMatches(matches) {
  matchesList.innerHTML = '';
  matches.forEach(match => {
    const li = document.createElement('li');

    li.innerHTML = `
      <div>
        <strong>${match.team1}</strong> vs <strong>${match.team2}</strong>
        <span class="odds">Cote : ${match.odds.toFixed(2)}</span>
      </div>
    `;

    if (match.status === 'open') {
      const select = document.createElement('select');
      select.innerHTML = `
        <option value="${match.team1}">${match.team1}</option>
        <option value="${match.team2}">${match.team2}</option>
      `;
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.placeholder = 'Points à parier';
      input.style.width = '90px';
      const btn = document.createElement('button');
      btn.textContent = 'Parier';
      btn.onclick = async () => {
        const stake = parseInt(input.value);
        const prediction = select.value;
        if (stake > 0 && currentUserData.points >= stake) {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            points: currentUserData.points - stake
          });
          const updatedBets = [...(match.bets || []), { userId: currentUser.uid, prediction, stake }];
          await updateDoc(doc(db, 'matches', match.id), { bets: updatedBets });
        } else {
          alert("Points insuffisants ou mise invalide.");
        }
      };
      li.append(select, input, btn);
    } else {
      li.innerHTML += '<em>Match terminé</em>';
    }

    if (match.status === 'open' && currentUserData?.isAdmin) {
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Clôturer';
      closeBtn.onclick = async () => {
        const winner = prompt(`Qui a gagné ? (${match.team1} ou ${match.team2})`);
        if (![match.team1, match.team2].includes(winner)) {
          alert("Choix invalide.");
          return;
        }
        await updateDoc(doc(db, 'matches', match.id), {
          status: 'closed',
          winner
        });

        // Récompenser les gagnants
        const winners = (match.bets || []).filter(b => b.prediction === winner);
        for (const w of winners) {
          const userRef = doc(db, 'users', w.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            await updateDoc(userRef, {
              points: data.points + w.stake * match.odds
            });
          }
        }
      };
      li.append(closeBtn);
    }

    matchesList.appendChild(li);
  });
}

function listenMatches() {
  const q = query(collection(db, 'matches'), orderBy('team1'));
  return onSnapshot(q, snapshot => {
    const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMatches(matches);
  });
}

function listenUserData(uid) {
  return onSnapshot(doc(db, 'users', uid), docSnap => {
    if (!docSnap.exists()) return;
    currentUserData = docSnap.data();
    profileEmail.textContent = currentUserData.email;
    profilePoints.textContent = currentUserData.points;

    if (currentUserData.isAdmin) {
      addMatchDiv.style.display = 'block';
    } else {
      addMatchDiv.style.display = 'none';
    }
  });
}

function updateRanking() {
  const q = query(collection(db, 'users'), orderBy('points', 'desc'));
  onSnapshot(q, snapshot => {
    rankingList.innerHTML = '';
    snapshot.docs.forEach(doc => {
      const user = doc.data();
      const li = document.createElement('li');
      li.textContent = `${user.email} - ${user.points} pts`;
      rankingList.appendChild(li);
    });
  });
}

function listenHistoryMatches() {
  const q = query(collection(db, 'matches'), orderBy('team1'));
  onSnapshot(q, snapshot => {
    const closedMatches = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(m => m.status === 'closed');
    renderHistory(closedMatches);
  });
}

function renderHistory(matches) {
  historyList.innerHTML = '';
  matches.forEach(match => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <strong>${match.team1}</strong> vs <strong>${match.team2}</strong><br />
        <em>Gagnant : ${match.winner}</em>
      </div>
    `;
    historyList.appendChild(li);
  });
}

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    authDiv.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    showSection(matchesSection);

    listenUserData(user.uid);
    listenMatches();
  } else {
    currentUser = null;
    currentUserData = null;
    authDiv.style.display = 'block';
    logoutBtn.style.display = 'none';
    showSection(authDiv);
    matchesList.innerHTML = '';
    profileEmail.textContent = '';
    profilePoints.textContent = '';
    rankingList.innerHTML = '';
    historyList.innerHTML = '';
  }
});
