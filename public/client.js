const socket = io();

// UI Elementi
const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');
const loginForm = document.getElementById('loginForm');
const waitingRoom = document.getElementById('waitingRoom');
const joinBtn = document.getElementById('joinBtn');
const playerNameInput = document.getElementById('playerNameInput');
const errorMsg = document.getElementById('errorMessage');
const playersList = document.getElementById('playersList');
const centerStatus = document.getElementById('centerStatus');

const quizContainer = document.getElementById('quizContainer');
const animationStatus = document.getElementById('animationStatus');
const questionTextEl = document.getElementById('questionText');
const timeLeftEl = document.getElementById('timeLeft');
const feedbackTextEl = document.getElementById('feedbackText');
const spectatorMsg = document.getElementById('spectatorMsg');
const gameOverScreen = document.getElementById('gameOverScreen');
const winnerName = document.getElementById('winnerName');
const animTitle = document.getElementById('animTitle');
const animMsg = document.getElementById('animMsg');

const answerBtns = [
    document.getElementById('ans0'),
    document.getElementById('ans1'),
    document.getElementById('ans2'),
    document.getElementById('ans3')
];

let myPlayerId = null;
let amIActive = true;
let TOTAL_FIELDS = 32;
let RADIUS = 200; // Malo veći radijus za neon tablu
let localTimer = null;

// LOBI LOGIKA
joinBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) {
        errorMsg.innerText = "MORAŠ UNETI IME!";
        return;
    }
    socket.emit('join_game', { name });
});

socket.on('error_message', (msg) => {
    errorMsg.innerText = msg;
});

socket.on('update_lobby', (data) => {
    const amIJoined = data.players.some(p => p.id === socket.id);
    if (amIJoined) {
        loginForm.classList.add('hidden');
        waitingRoom.classList.remove('hidden');
    }
    
    playersList.innerHTML = '';
    data.players.forEach(p => {
        const li = document.createElement('li');
        // Boja tačkice dodata direktno
        li.innerHTML = `<span class="color-dot" style="background:${p.color}; box-shadow: 0 0 10px ${p.color};"></span> ${p.name} ${p.id === socket.id ? '(TI)' : ''}`;
        playersList.appendChild(li);
        if (p.id === socket.id) myPlayerId = socket.id;
    });
    
    document.getElementById('lobbyStatusMessage').innerText = `Čekamo ostale igrače... (${data.players.length}/${data.maxPlayers})`;
});

socket.on('lobby_message', (msg) => {
    document.getElementById('lobbyStatusMessage').innerText = msg;
    document.getElementById('lobbyStatusMessage').className = 'status-message neon-text-green';
});

// IGRA LOGIKA
socket.on('game_started', (data) => {
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    TOTAL_FIELDS = data.totalFields;
    createBoard(data.players);
    updateCenterStatus(data.players);
});

socket.on('new_question', (data) => {
    animationStatus.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    if (amIActive) {
        quizContainer.classList.remove('hidden');
        spectatorMsg.classList.add('hidden');
    } else {
        quizContainer.classList.add('hidden');
        spectatorMsg.classList.remove('hidden');
    }

    feedbackTextEl.innerText = "";
    questionTextEl.innerText = data.q;
    
    answerBtns.forEach((btn, index) => {
        btn.innerText = data.answers[index];
        btn.disabled = !amIActive;
        btn.className = 'answer-btn neon-btn-blue'; // reset styles
        btn.onclick = () => submitAnswer(index, btn);
    });
    
    startLocalTimer(data.timeLimit);
});

function submitAnswer(index, btn) {
    if (!amIActive) return;
    
    socket.emit('submit_answer', index);
    
    answerBtns.forEach(b => b.disabled = true);
    if(btn) btn.classList.add('selected');
    
    feedbackTextEl.innerText = "ODGOVOR ZABELEŽEN. ČEKAMO OSTALE...";
    feedbackTextEl.className = 'feedback neon-text-blue';
    clearInterval(localTimer);
}

function startLocalTimer(seconds) {
    let timeLeft = seconds;
    timeLeftEl.innerText = timeLeft;
    clearInterval(localTimer);
    
    localTimer = setInterval(() => {
        timeLeft--;
        timeLeftEl.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(localTimer);
            if (amIActive && !answerBtns[0].disabled) {
                submitAnswer(-1, null);
            }
        }
    }, 1000);
}

socket.on('round_results', (data) => {
    clearInterval(localTimer);
    
    // ----- BOJENJE DUGMADI (NOVI DEO) -----
    if (data.playerResults && data.correctAnswerIndex !== undefined) {
        const myResult = data.playerResults.find(p => p.id === myPlayerId);
        
        answerBtns.forEach((btn, index) => {
            btn.disabled = true;
            btn.classList.remove('selected');
            
            if (index === data.correctAnswerIndex) {
                btn.classList.add('correct');
            }
            if (myResult && !myResult.correct && index === myResult.answerIndex) {
                btn.classList.add('wrong');
            }
        });

        if (myResult && myResult.correct) {
            feedbackTextEl.innerText = "TAČAN ODGOVOR!";
            feedbackTextEl.className = 'feedback neon-text-green';
        } else if (myResult && !myResult.correct) {
            feedbackTextEl.innerText = "POGREŠAN ODGOVOR!";
            feedbackTextEl.className = 'feedback error-text';
        }
    }
    // ----- KRAJ NOVOG DELA -----

    // Čekamo 3 sekunde da igrači vide boje pre nego što sakrijemo kviz
    setTimeout(() => {
        quizContainer.classList.add('hidden');
        animationStatus.classList.remove('hidden');
        
        animTitle.innerText = "REZULTATI!";
        animTitle.className = "neon-text-blue";
        animMsg.innerHTML = "POMERANJE FIGURICA...<br>";
        
        data.players.forEach(p => {
            if (p.id === myPlayerId) {
                amIActive = p.active;
            }
            updatePiecePosition(p);
        });
        
        updateCenterStatus(data.players);
        
        if (data.eliminatedMessages.length > 0) {
            animTitle.innerText = "NEKO JE POJEDEN!";
            animTitle.className = "neon-text-pink blink";
            data.eliminatedMessages.forEach(msg => {
                animMsg.innerHTML += `<br><strong style="color:#ff003c; text-shadow: 0 0 10px #ff003c">${msg}</strong>`;
            });
        }
    }, 3000);
});

socket.on('game_over', (data) => {
    quizContainer.classList.add('hidden');
    animationStatus.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    winnerName.innerText = data.message;
});

// TABLA I CRTANJE
const boardEl = document.getElementById('board');

function createBoard(players) {
    boardEl.innerHTML = '';
    
    for (let i = 0; i < TOTAL_FIELDS; i++) {
        const field = document.createElement('div');
        field.className = 'field';
        if (i % 8 === 0) field.classList.add('start-point');
        
        const angle = (i * (360 / TOTAL_FIELDS)) - 90;
        const angleRad = angle * (Math.PI / 180);
        const x = Math.cos(angleRad) * RADIUS;
        const y = Math.sin(angleRad) * RADIUS;
        
        field.style.transform = `translate(${x}px, ${y}px)`;
        boardEl.appendChild(field);
    }

    players.forEach(p => {
        const piece = document.createElement('div');
        piece.id = 'piece_' + p.id;
        piece.className = 'player-piece';
        piece.style.background = p.color;
        piece.style.boxShadow = `0 0 20px ${p.color}, inset 0 0 10px #fff`;
        boardEl.appendChild(piece);
        updatePiecePosition(p);
    });
}

function updatePiecePosition(player) {
    const piece = document.getElementById('piece_' + player.id);
    if (!piece) return;
    
    if (!player.active) {
        piece.classList.add('eliminated');
        return;
    }
    
    const angle = (player.pos * (360 / TOTAL_FIELDS)) - 90;
    const angleRad = angle * (Math.PI / 180);
    
    let offsetRadius = RADIUS;
    const idx = player.color.charCodeAt(1) % 3; 
    offsetRadius += (idx - 1) * 12; // Malo veći offset zbog većih glow efekata
    
    const x = Math.cos(angleRad) * offsetRadius;
    const y = Math.sin(angleRad) * offsetRadius;
    
    piece.style.transform = `translate(${x}px, ${y}px)`;
}

function updateCenterStatus(players) {
    centerStatus.innerHTML = '<h3 class="neon-text-blue" style="margin-bottom:10px;">STATUS</h3>';
    players.forEach(p => {
        const div = document.createElement('div');
        div.className = 'player-info' + (!p.active ? ' dead' : '');
        div.style.color = p.color;
        div.innerText = `${p.name}: ${p.totalSteps} / ${TOTAL_FIELDS}`;
        centerStatus.appendChild(div);
    });
}