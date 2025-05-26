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
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { auth, db } from './firebase-config.js';

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authDiv = document.getElementById('auth');

const team1Input = document.getElementById('team1');
const team2Input = document.getElementById('team2');
const predictionInput = document.getElementById('prediction');
const stakeInput = document.getElementById('stake');
const placeBetBtn = document.getElementById('placeBetBtn');
const matchesList = document.getElementById('bet-history');
const matchesSection = document.getElementById('bet-section');
const userPointsDisplay = document.getElementById('userPoints');
const pointsValue = document.getElementById('pointsValue');

let currentUser = null;
let currentUserData = null;

registerBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Vérifie si c'est le premier utilisateur
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const isFirstUser = usersSnapshot.empty;

    await setDoc(doc(db, 'users', uid), {
      email,
      points: 50,
      isAdmin: isFirstUser
    });

    alert('Inscription réussie. Vous avez reçu 50 points.');
  } catch (error) {
    alert('Erreur inscription : ' + error.message);
  }
});

loginBtn.addEventListener('click', async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (error) {
    alert('Erreur connexion : ' + error.message);
  }
});

logoutBtn.addEventListener('click', () => {
  signOut(auth);
});

placeBetBtn.addEventListener('click', async () => {
  if (!currentUser) return;

  const team1 = team1Input.value.trim();
  const team2 = team2Input.value.trim();
  const prediction = predictionInput.value.trim();
  const stake = parseInt(stakeInput.value.trim());

  if (!team1 || !team2 || !prediction || isNaN(stake)) {
    alert('Remplis tous les champs.');
    return;
  }

  if (currentUserData.points < stake) {
    alert("Tu n'as pas assez de points !");
    return;
  }

  const match = {
    team1,
    team2,
    status: 'open',
    bets: [{
      userId: currentUser.uid,
      prediction,
      stake
    }]
  };

  await addDoc(collection(db, 'matches'), match);
  await updateDoc(doc(db, 'users', currentUser.uid), {
    points: currentUserData.points - stake
  });
});

function renderMatches(matches) {
  matchesList.innerHTML = '';

  matches.forEach(match => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${match.team1}</strong> vs <strong>${match.team2}</strong><br/>
      ${match.status === 'closed' ? '<em>Match terminé</em>' : ''}
    `;

    if (match.status === 'open') {
      const betForm = document.createElement('div');
      const select = document.createElement('select');
      select.innerHTML = `
        <option value="${match.team1}">${match.team1}</option>
        <option value="${match.team2}">${match.team2}</option>
      `;
      const inputStake = document.createElement('input');
      inputStake.type = 'number';
      inputStake.placeholder = 'Points';
      const submitBtn = document.createElement('button');
      submitBtn.textContent = 'Parier';
      submitBtn.onclick = async () => {
        const prediction = select.value;
        const stake = parseInt(inputStake.value);
        if (isNaN(stake) || stake <= 0) return;

        await updateDoc(doc(db, 'users', currentUser.uid), {
          points: currentUserData.points - stake
        });

        const updatedBets = [...(match.bets || []), {
          userId: currentUser.uid,
          prediction,
          stake
        }];

        await updateDoc(doc(db, 'matches', match.id), { bets: updatedBets });
      };
      betForm.append(select, inputStake, submitBtn);
      li.append(betForm);
    }

    if (match.status === 'open' && currentUserData?.isAdmin) {
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Clôturer ce pari';
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

onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (user) {
    const docSnap = await getDoc(doc(db, 'users', user.uid));
    currentUserData = docSnap.exists() ? docSnap.data() : null;

    authDiv.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    userPointsDisplay.style.display = 'block';
    matchesSection.style.display = 'block';
    pointsValue.textContent = currentUserData?.points ?? 0;

    listenMatches();
  } else {
    authDiv.style.display = 'block';
    logoutBtn.style.display = 'none';
    userPointsDisplay.style.display = 'none';
    matchesSection.style.display = 'none';
    matchesList.innerHTML = '';
    currentUserData = null;
  }
});
