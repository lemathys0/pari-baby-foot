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

const pseudoInput = document.getElementById('pseudoInput');
const savePseudoBtn = document.getElementById('savePseudoBtn');

let currentUser = null;
let currentUserData = null;

function showSection(section) {
  matchesSection.style.display = 'none';
  profileSection.style.display = 'none';
  rankingSection.style.display = 'none';
  historySection.style.display = 'none';

  [menuMatchesBtn, menuProfileBtn, menuLeaderboardBtn, menuHistoryBtn].forEach(btn => btn.classList.remove('active'));

  section.style.display = 'block';

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

savePseudoBtn.addEventListener('click', async () => {
  if (!currentUser) {
    alert("Vous devez être connecté pour enregistrer un pseudo.");
    return;
  }

  const newPseudo = pseudoInput.value.trim();
  if (newPseudo.length < 3) {
    alert("Le pseudo doit contenir au moins 3 caractères.");
    return;
  }

  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      pseudo: newPseudo
    });
    alert("Pseudo sauvegardé !");
  } catch (error) {
    alert("Erreur lors de la sauvegarde du pseudo : " + error.message);
  }
});

function renderMatches(matches) {
  matchesList.innerHTML = '';
  matches.forEach(match => {
    const li = document.createElement('li');

    const oddsText = (typeof match.odds === 'number' && !isNaN(match.odds)) ? match.odds.toFixed(2) : 'N/A';

    li.innerHTML = `
      <div>
        <strong>${match.team1}</strong> vs <strong>${match.team2}</strong>
        <span class="odds">Cote : ${oddsText}</span>
      </div>
    `;

    if (match.status === 'open') {
      const userBet = (match.bets || []).find(b => b.userId === currentUser.uid);

      if (userBet) {
        const betInfo = document.createElement('div');
        betInfo.textContent = `Vous avez parié ${userBet.stake} points sur ${userBet.prediction}.`;
        li.appendChild(betInfo);
      } else {
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
      }
    } else {
      li.innerHTML += '<em>Match terminé</em>';
    }

    if (match.status === 'open' && currentUserData?.isAdmin) {
      // Boutons pour choisir le gagnant au lieu d'un prompt
      const winnerDiv = document.createElement('div');
      winnerDiv.style.marginTop = '8px';

      const label = document.createElement('span');
      label.textContent = 'Clôturer le match, choisir le gagnant : ';
      winnerDiv.appendChild(label);

      const btnTeam1 = document.createElement('button');
      btnTeam1.textContent = match.team1;
      btnTeam1.style.marginRight = '5px';
      btnTeam1.onclick = () => closeMatch(match, match.team1);
      winnerDiv.appendChild(btnTeam1);

      const btnTeam2 = document.createElement('button');
      btnTeam2.textContent = match.team2;
      btnTeam2.onclick = () => closeMatch(match, match.team2);
      winnerDiv.appendChild(btnTeam2);

      li.appendChild(winnerDiv);
    }

    matchesList.appendChild(li);
  });
}

async function closeMatch(match, winner) {
  if (![match.team1, match.team2].includes(winner)) {
    alert("Choix invalide.");
    return;
  }
  try {
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
  } catch (error) {
    alert("Erreur lors de la clôture : " + error.message);
  }
}

function listenMatches() {
  const q = query(collection(db, 'matches'), orderBy('team1'));
  return onSnapshot(q, snapshot => {
    const openMatches = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(m => m.status === 'open'); // <-- filtrage des matchs ouverts ici
    renderMatches(openMatches);
  });
}

function listenUserData(uid) {
  return onSnapshot(doc(db, 'users', uid), docSnap => {
    if (!docSnap.exists()) return;
    currentUserData = docSnap.data();
    profileEmail.textContent = currentUserData.email;
    profilePoints.textContent = currentUserData.points;
    pseudoInput.value = currentUserData.pseudo || '';

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
      const displayName = user.pseudo ? user.pseudo : user.email;
      const li = document.createElement('li');
      li.textContent = `${displayName} - ${user.points} pts`;
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

    let text = `${match.team1} vs ${match.team2} - Gagnant : ${match.winner}`;

    const userBet = (match.bets || []).find(b => b.userId === currentUser.uid);
    if (userBet) {
      if (userBet.prediction === match.winner) {
        const gain = userBet.stake * match.odds;
        text += ` (Gain : +${gain.toFixed(2)} pts)`;
      } else {
        text += ` (Perte : -${userBet.stake} pts)`;
      }
    } else {
      text += ' (Pas parié)';
    }

    li.textContent = text;
    historyList.appendChild(li);
  });
}

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    authDiv.style.display = 'none';
    showSection(matchesSection);
    listenUserData(user.uid);
    listenMatches();
  } else {
    authDiv.style.display = 'block';
    matchesSection.style.display = 'none';
    profileSection.style.display = 'none';
    rankingSection.style.display = 'none';
    historySection.style.display = 'none';
    currentUserData = null;
  }
});
