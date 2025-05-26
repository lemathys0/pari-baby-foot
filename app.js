// app.js
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

const navMatches = document.getElementById('menuMatchesBtn');
const navProfile = document.getElementById('menuProfileBtn');
const navRanking = document.getElementById('menuLeaderboardBtn');

const team1Input = document.getElementById('team1');
const team2Input = document.getElementById('team2');
const addMatchBtn = document.getElementById('addMatchBtn');
const matchesList = document.getElementById('matches-list');
const adminSection = document.getElementById('admin-section');

const profileEmail = document.getElementById('profileEmail');
const profilePoints = document.getElementById('profilePoints');
const rankingList = document.getElementById('leaderboardList');

let currentUser = null;
let currentUserData = null;

function showSection(section) {
  matchesSection.style.display = 'none';
  profileSection.style.display = 'none';
  rankingSection.style.display = 'none';
  section.style.display = 'block';
}

navMatches.addEventListener('click', () => showSection(matchesSection));
navProfile.addEventListener('click', () => showSection(profileSection));
navRanking.addEventListener('click', () => {
  showSection(rankingSection);
  updateRanking();
});

registerBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
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
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (error) {
    alert('Erreur: ' + error.message);
  }
});

logoutBtn.addEventListener('click', () => signOut(auth));

addMatchBtn.addEventListener('click', async () => {
  const team1 = team1Input.value.trim();
  const team2 = team2Input.value.trim();
  if (!team1 || !team2) return;

  await addDoc(collection(db, 'matches'), {
    team1,
    team2,
    status: 'open',
    bets: []
  });

  team1Input.value = '';
  team2Input.value = '';
});

function renderMatches(matches) {
  matchesList.innerHTML = '';
  matches.forEach(match => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${match.team1}</strong> vs <strong>${match.team2}</strong><br/>`;

    if (match.status === 'open') {
      const select = document.createElement('select');
      select.innerHTML = `<option value="${match.team1}">${match.team1}</option><option value="${match.team2}">${match.team2}</option>`;
      const input = document.createElement('input');
      input.type = 'number';
      input.placeholder = 'Points';
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
        if (![match.team1, match.team2].includes(winner)) return;
        const updatedMatch = { ...match, status: 'closed' };
        await updateDoc(doc(db, 'matches', match.id), updatedMatch);

        const winners = match.bets.filter(b => b.prediction === winner);
        for (const w of winners) {
          const userRef = doc(db, 'users', w.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            await updateDoc(userRef, { points: data.points + w.stake * 2 });
          }
        }
      };
      li.appendChild(closeBtn);
    }

    matchesList.appendChild(li);
  });
}

function listenMatches() {
  onSnapshot(collection(db, 'matches'), snapshot => {
    const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMatches(matches);
  });
}

async function updateRanking() {
  rankingList.innerHTML = '';
  const q = query(collection(db, 'users'), orderBy('points', 'desc'));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    const data = doc.data();
    const li = document.createElement('li');
    li.textContent = `${data.email} - ${data.points} points`;
    rankingList.appendChild(li);
  });
}

onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (user) {
    const docSnap = await getDoc(doc(db, 'users', user.uid));
    currentUserData = docSnap.exists() ? docSnap.data() : null;

    authDiv.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    profileEmail.textContent = currentUserData?.email ?? '';
    profilePoints.textContent = currentUserData?.points ?? 0;

    if (currentUserData?.isAdmin) {
      adminSection.style.display = 'block';
    } else {
      adminSection.style.display = 'none';
    }

    showSection(matchesSection);
    listenMatches();
  } else {
    authDiv.style.display = 'block';
    logoutBtn.style.display = 'none';
    matchesList.innerHTML = '';
    profileEmail.textContent = '';
    profilePoints.textContent = '';
    adminSection.style.display = 'none';
    showSection(matchesSection);
  }
});
