const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Služimo statičke fajlove iz 'public' foldera
app.use(express.static(path.join(__dirname, 'public')));

// Baza probnih pitanja
const questions = [
    { q: "Koji je glavni grad Srbije?", answers: ["Niš", "Novi Sad", "Beograd", "Kragujevac"], correct: 2 },
    { q: "Koliko igrača ima fudbalski tim na terenu?", answers: ["9", "10", "11", "12"], correct: 2 },
    { q: "Koja planeta je najbliža Suncu?", answers: ["Venera", "Merkur", "Zemlja", "Mars"], correct: 1 },
    { q: "Ko je napisao 'Na Drini ćuprija'?", answers: ["Ivo Andrić", "Miloš Crnjanski", "Meša Selimović", "Dobrica Ćosić"], correct: 0 },
    { q: "Koji je najviši vrh na svetu?", answers: ["K2", "Mont Blan", "Kilimandžaro", "Mont Everest"], correct: 3 },
    { q: "Od čega se pravi staklo?", answers: ["Kamena", "Peska", "Drveta", "Plastike"], correct: 1 },
    { q: "Koji gas udišemo da bismo preživeli?", answers: ["Ugljen-dioksid", "Azot", "Helijum", "Kiseonik"], correct: 3 },
    { q: "Ko je naslikao Mona Lizu?", answers: ["Pikaso", "Van Gog", "Leonardo da Vinči", "Mikelanđelo"], correct: 2 },
    { q: "Koji kontinent je ujedno i država?", answers: ["Australija", "Evropa", "Afrika", "Antarktik"], correct: 0 },
    { q: "Koliko dana ima prestupna godina?", answers: ["364", "365", "366", "367"], correct: 2 }
];

// Stanje igre
const TOTAL_FIELDS = 32;
const MAX_PLAYERS = 4;
const START_POSITIONS = [0, 8, 16, 24];
const PLAYER_COLORS = ['#ff00ea', '#00f3ff', '#39ff14', '#ffff4d']; // Prilagođene neonske boje za server

let gameState = {
    status: 'lobby', // lobby, playing, finished
    players: [], // { id, name, color, pos, startPos, totalSteps, active, connected, lastAnswerCorrect: false, isBot: false }
    currentQuestionIndex: -1,
    answersReceivedThisRound: 0,
    roundTimer: null,
    usedQuestions: []
};

let lobbyTimer = null;

// Funkcije igre
function getNextQuestion() {
    if (gameState.usedQuestions.length >= questions.length) {
        gameState.usedQuestions = []; // Reset ako ponestane
    }
    let qIndex;
    do {
        qIndex = Math.floor(Math.random() * questions.length);
    } while (gameState.usedQuestions.includes(qIndex));
    
    gameState.usedQuestions.push(qIndex);
    return questions[qIndex];
}

function startGame() {
    gameState.status = 'playing';
    gameState.usedQuestions = [];
    
    // Resetujemo stanje igrača
    gameState.players.forEach((p, idx) => {
        p.pos = START_POSITIONS[idx];
        p.startPos = START_POSITIONS[idx];
        p.totalSteps = 0;
        p.active = true;
        p.lastAnswerCorrect = false;
    });

    io.emit('game_started', { players: gameState.players, totalFields: TOTAL_FIELDS });
    
    setTimeout(sendNextQuestion, 2000); // 2 sekunde uvodne pauze
}

function fillWithBotsAndStart() {
    if (gameState.status !== 'lobby' || gameState.players.length === 0) return;
    
    while (gameState.players.length < MAX_PLAYERS) {
        gameState.players.push({
            id: 'bot_' + Math.random(),
            name: 'Bot ' + (gameState.players.length + 1),
            color: PLAYER_COLORS[gameState.players.length],
            pos: 0,
            startPos: 0,
            totalSteps: 0,
            active: true,
            connected: true,
            lastAnswerCorrect: false,
            isBot: true
        });
    }
    
    io.emit('update_lobby', { players: gameState.players, maxPlayers: MAX_PLAYERS });
    io.emit('lobby_message', 'VREME JE ISTEKLO! BOTOVI SU PREUZELI. IGRA POČINJE...');
    setTimeout(startGame, 3000);
}

function sendNextQuestion() {
    if (gameState.status !== 'playing') return;

    gameState.answersReceivedThisRound = 0;
    gameState.players.forEach(p => p.lastAnswerCorrect = false);
    
    const questionObj = getNextQuestion();
    gameState.currentQuestionIndex = questions.indexOf(questionObj);
    
    const questionToSend = {
        q: questionObj.q,
        answers: questionObj.answers,
        timeLimit: 15
    };
    
    io.emit('new_question', questionToSend);
    
    // Botovi daju odgovore
    gameState.players.forEach(p => {
        if (p.isBot && p.active) {
            const isCorrect = Math.random() > 0.5; // 50% sansa da bot pogodi
            const delay = Math.random() * 8000 + 2000; // bot odgovara izmedju 2. i 10. sekunde
            
            setTimeout(() => {
                if (gameState.status === 'playing' && p.active) {
                    p.lastAnswerCorrect = isCorrect;
                    gameState.answersReceivedThisRound++;
                    checkRoundEnd();
                }
            }, delay);
        }
    });
    
    // Tajmer na serveru
    gameState.roundTimer = setTimeout(() => {
        processRoundResults();
    }, 15000 + 1000); // 15 sekundi + 1s bafera za kašnjenje mreže
}

function checkRoundEnd() {
    const activeCount = gameState.players.filter(p => p.active).length;
    if (gameState.answersReceivedThisRound >= activeCount) {
        processRoundResults();
    }
}

function distance(start, end) {
    if (end >= start) return end - start;
    return (TOTAL_FIELDS - start) + end;
}

function processRoundResults() {
    clearTimeout(gameState.roundTimer);
    
    const results = gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        correct: p.lastAnswerCorrect,
        wasActive: p.active
    }));
    
    const oldPositions = gameState.players.map(p => p.pos);
    
    // Pomeranje
    gameState.players.forEach(p => {
        if (p.active && p.lastAnswerCorrect) {
            p.pos = (p.pos + 1) % TOTAL_FIELDS;
            p.totalSteps += 1;
        }
    });
    
    // Jedenje
    let eliminatedMessages = [];
    for (let i = 0; i < gameState.players.length; i++) {
        for (let j = 0; j < gameState.players.length; j++) {
            if (i !== j && gameState.players[i].active && gameState.players[j].active) {
                const predator = gameState.players[i];
                const prey = gameState.players[j];
                
                const oldDist = distance(oldPositions[i], oldPositions[j]);
                if (oldDist === 1 && predator.lastAnswerCorrect && !prey.lastAnswerCorrect) {
                    prey.active = false;
                    eliminatedMessages.push(`${predator.name.toUpperCase()} JE POJEO IGRAČA ${prey.name.toUpperCase()}!`);
                }
            }
        }
    }
    
    // Provera pobede
    let winners = [];
    gameState.players.forEach(p => {
        if (p.active && p.totalSteps >= TOTAL_FIELDS) {
            winners.push(p);
        }
    });
    
    io.emit('round_results', {
        players: gameState.players,
        correctAnswerIndex: questions[gameState.currentQuestionIndex].correct,
        eliminatedMessages: eliminatedMessages
    });
    
    if (winners.length > 0) {
        gameState.status = 'finished';
        if (winners.length === 1) {
            io.emit('game_over', { message: `${winners[0].name.toUpperCase()} JE POBEDIO!`, winners: winners });
        } else {
            io.emit('game_over', { message: `MRTVA TRKA! Produžeci!`, winners: winners });
        }
        return;
    }
    
    const activePlayers = gameState.players.filter(p => p.active);
    if (activePlayers.length <= 1 && gameState.players.length > 1) {
        gameState.status = 'finished';
        if (activePlayers.length === 1) {
            io.emit('game_over', { message: `${activePlayers[0].name.toUpperCase()} JE JEDINI PREŽIVEO!`, winners: activePlayers });
        } else {
            io.emit('game_over', { message: `SVI SU POJEDENI?! Nema pobednika.`, winners: [] });
        }
        return;
    }
    
    setTimeout(sendNextQuestion, 5000);
}


// Socket.IO događaji
io.on('connection', (socket) => {
    console.log('Novi klijent povezan:', socket.id);
    
    socket.emit('update_lobby', { players: gameState.players, maxPlayers: MAX_PLAYERS });

    socket.on('join_game', (data) => {
        if (gameState.status !== 'lobby') {
            socket.emit('error_message', 'IGRA JE VEĆ U TOKU!');
            return;
        }
        
        if (gameState.players.length >= MAX_PLAYERS) {
            socket.emit('error_message', 'SOBA JE PUNA!');
            return;
        }
        
        if (gameState.players.find(p => p.id === socket.id)) return;

        const newPlayer = {
            id: socket.id,
            name: data.name || `Igrač ${gameState.players.length + 1}`,
            color: PLAYER_COLORS[gameState.players.length],
            pos: 0,
            startPos: 0,
            totalSteps: 0,
            active: true,
            connected: true,
            lastAnswerCorrect: false,
            isBot: false
        };
        
        gameState.players.push(newPlayer);
        console.log(`${newPlayer.name} se pridružio igri.`);
        
        if (gameState.players.length === 1) {
            // Prvi igrač ušao, pokrećemo tajmer od 3 minuta (180000 ms) za botove
            lobbyTimer = setTimeout(fillWithBotsAndStart, 180000);
        }
        
        io.emit('update_lobby', { players: gameState.players, maxPlayers: MAX_PLAYERS });
        
        if (gameState.players.length === MAX_PLAYERS) {
            clearTimeout(lobbyTimer);
            setTimeout(startGame, 3000);
            io.emit('lobby_message', 'SVI IGRAČI SU TU! IGRA POČINJE ZA 3 SEKUNDE...');
        }
    });

    socket.on('submit_answer', (answerIndex) => {
        if (gameState.status !== 'playing') return;
        
        const player = gameState.players.find(p => p.id === socket.id);
        if (!player || !player.active) return;
        
        const correctAnswer = questions[gameState.currentQuestionIndex].correct;
        player.lastAnswerCorrect = (answerIndex === correctAnswer);
        
        gameState.answersReceivedThisRound++;
        checkRoundEnd();
    });

    socket.on('disconnect', () => {
        console.log('Klijent prekinuo vezu:', socket.id);
        const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
        
        if (playerIndex !== -1) {
            if (gameState.status === 'lobby') {
                gameState.players.splice(playerIndex, 1);
                io.emit('update_lobby', { players: gameState.players, maxPlayers: MAX_PLAYERS });
            } else {
                gameState.players[playerIndex].connected = false;
                gameState.players[playerIndex].active = false;
                io.emit('player_disconnected', gameState.players[playerIndex].name);
                
                const activeCount = gameState.players.filter(p => p.active && p.connected).length;
                if (activeCount === 0) {
                    gameState.status = 'lobby';
                    gameState.players = [];
                } else if (activeCount === 1) {
                    processRoundResults();
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server radi na portu ${PORT}`);
});
