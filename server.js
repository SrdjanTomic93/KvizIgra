const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Služimo statičke fajlove iz 'public' foldera
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Poveži se na MongoDB
const MONGO_URI = 'mongodb+srv://SrkiTomic93:Dekadeka93@cluster0.zeyuaxo.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI)
  .then(() => {
      console.log('Povezan na MongoDB');
      seedDatabase(); // Proveravamo i punimo bazu ako je prazna
  })
  .catch(err => console.error('Greška pri povezivanju:', err));

// Šema za pitanje
const questionSchema = new mongoose.Schema({
    q: String,
    answers: [String],
    correct: Number,
    category: { type: String, default: 'opsta_kultura' }
});

const Question = mongoose.model('Question', questionSchema);

// Fallback pitanja (koriste se za prvo punjenje baze)
const fallbackQuestions = [
    {q: "Ko je napisao 'Proces'?", answers: ["Franc Kafka", "Herman Hese", "Tomas Man", "Robert Muzil"], correct: 0 },
    {q: "Šta je Pitagorina teorema?", answers: ["a² + b² = c²", "E = mc²", "F = ma", "V = IR"], correct: 0 },
    {q: "Koji je glavni grad Toga?", answers:  ["Abidžan", "Lome", "Najrobi", "Kinsaša"], correct: 1 },
    {q: "Osnivac stoicizma je ?", answers: ["Zenon", "Platon", "Niče", "Arhimed"], correct: 0 },
    {q: "Koji element je najzastupljeniji u Zemljinoj atmosferi?", answers: ["Kiseonik", "Ugljen-dioksid", "Azot", "Vodonik"], correct: 2 },
    {q: "Roman Dorucak kod Tifanija je pisao", answers: ["Bred Iston", "Truman Kapote", "Tes Geritsen", "Tomas Haris"], correct: 1 },
    {q: "Kolliko godina je trajao stogodisnji rat?", answers: ["116", "118", "87", "105"], correct: 0},
    {q: "Povrsinski gledano najmanja drzava Azije je ?", answers: ["Sri Lanka", "Singapur", "Brunej", "Maldivi"], correct: 3},
    {q: "Koji je najveći sisar na planeti?", answers: ["Afrički slon", "Plavi kit", "Žirafa", "Kit ajkula"], correct: 1 },
    {q: "Koliko ima nula u broju milion?", answers: ["3", "4", "5", "6"], correct: 3 },
    {q: "Medju rimski car od ponudjenih ne spada u tkz.dobre", answers: ["Nerva", "Trajan", "Hadrijan", "Konstantin"], correct: 3},
    {q: "Koji je glavni grad Nikaragve?", answers: ["Managva", "Asonsion", "Port taun", "Tegucigalpa"], correct: 0 },
    {q: "Koje godine je rodjen pisac Danilo Kiš?", answers: ["1925", "1935", "1945", "1955"], correct: 1 },
    {q: "Ko je napisao 'Stranca'?", answers: ["Žan-Pol Sartr", "Alber Kami", "Simon de Bovoar", "Marsel Prust"], correct: 1 },
    {q: "Ko je naslikao Mona Lizu?", answers: ["Pikaso", "Van Gog", "Leonardo da Vinči", "Mikelanđelo"], correct: 2 }
];

async function seedDatabase() {
    try {
        const count = await Question.countDocuments();
        if (count === 0) {
            console.log("Baza je prazna. Ubacujem početna pitanja...");
            await Question.insertMany(fallbackQuestions);
            console.log("Pitanja su uspešno ubačena!");
        } else {
            console.log(`Baza već sadrži ${count} pitanja.`);
        }
    } catch (error) {
        console.error("Greška pri seedovanju baze:", error);
    }
}

// Stanje igre
const TOTAL_FIELDS = 32;
const MAX_PLAYERS = 4;
const START_POSITIONS = [0, 8, 16, 24];
const PLAYER_COLORS = ['#ff00ea', '#00f3ff', '#39ff14', '#ffff4d']; // Prilagođene neonske boje za server

let gameState = {
    status: 'lobby', // lobby, playing, finished
    players: [], // { id, name, color, pos, startPos, totalSteps, active, connected, lastAnswerCorrect: false, isBot: false }
    currentQuestionIndex: -1, // deprecated for DB but kept for compat
    lastQuestionCorrect: 0, // Čuvamo tačan odgovor za trenutnu rundu
    answersReceivedThisRound: 0,
    roundTimer: null,
    usedQuestions: [] // Niz _id vrednosti iz MongoDB
};

let lobbyTimer = null;

// Funkcije igre
async function getNextQuestion() {
    try {
        const totalDocs = await Question.countDocuments();
        if (totalDocs === 0) {
            // Fallback ako baza padne ili se izbriše
            return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
        }
        
        if (gameState.usedQuestions.length >= totalDocs) {
            gameState.usedQuestions = [];
        }
        
        const questionDoc = await Question.aggregate([
            { $match: { _id: { $nin: gameState.usedQuestions } } },
            { $sample: { size: 1 } }
        ]);
        
        if (questionDoc.length === 0) {
            gameState.usedQuestions = [];
            return await getNextQuestion();
        }
        
        const q = questionDoc[0];
        gameState.usedQuestions.push(q._id);
        
        return {
            q: q.q,
            answers: q.answers,
            correct: q.correct,
            _id: q._id
        };
    } catch (err) {
        console.error("Greška pri dohvatanju pitanja:", err);
        return fallbackQuestions[0]; // Hitni fallback
    }
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
        p.lastAnswerIndex = null;
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
            lastAnswerIndex: null,
            isBot: true
        });
    }
    
    io.emit('update_lobby', { players: gameState.players, maxPlayers: MAX_PLAYERS });
    io.emit('lobby_message', 'VREME JE ISTEKLO! BOTOVI SU PREUZELI. IGRA POČINJE...');
    setTimeout(startGame, 3000);
}

async function sendNextQuestion() {
    if (gameState.status !== 'playing') return;

    gameState.answersReceivedThisRound = 0;
    gameState.players.forEach(p => {
        p.lastAnswerCorrect = false;
        p.lastAnswerIndex = null;
    });

    const questionObj = await getNextQuestion();
    gameState.lastQuestionCorrect = questionObj.correct; // Čuvamo tačan odgovor za proveru

    const questionToSend = {
        q: questionObj.q,
        answers: questionObj.answers,
        timeLimit: 15 // vraćeno na 15s za bržu igru
    };

    io.emit('new_question', questionToSend);

    // Botovi daju odgovore
    gameState.players.forEach(p => {
        if (p.isBot && p.active) {
            const isCorrect = Math.random() > 0.5; // 50% sansa
            const delay = Math.random() * 8000 + 2000; // bot odgovara izmedju 2. i 10. sekunde

            setTimeout(() => {
                if (gameState.status === 'playing' && p.active) {
                    p.lastAnswerCorrect = isCorrect;
                    
                    // Bot "bira" indeks
                    if (isCorrect) {
                        p.lastAnswerIndex = gameState.lastQuestionCorrect;
                    } else {
                        // Nasumičan pogrešan odgovor
                        let wrongAnswers = [0,1,2,3].filter(idx => idx !== gameState.lastQuestionCorrect);
                        p.lastAnswerIndex = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
                    }

                    gameState.answersReceivedThisRound++;
                    checkRoundEnd();
                }
            }, delay);
        }
    });

    // Tajmer na serveru (15s + malo bafera)
    gameState.roundTimer = setTimeout(() => {
        processRoundResults();
    }, 15000 + 1000); 
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

    // Prikupljamo detaljne rezultate za prikaz boja klijentima
    const playerResults = gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        correct: p.lastAnswerCorrect,
        wasActive: p.active,
        answerIndex: p.lastAnswerIndex !== undefined ? p.lastAnswerIndex : null
    }));

    io.emit('round_results', {
        players: gameState.players,
        correctAnswerIndex: gameState.lastQuestionCorrect,
        eliminatedMessages: eliminatedMessages,
        playerResults: playerResults
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

    setTimeout(sendNextQuestion, 8000); // 8 sekundi kašnjenja zbog klijentske animacije
}

// Provera da li ima živih ljudi u igri
function checkForHumanPlayers() {
    const humanPlayers = gameState.players.filter(p => !p.isBot && p.connected);
    if (humanPlayers.length === 0 && gameState.status === 'playing') {
        clearTimeout(gameState.roundTimer);
        gameState.status = 'lobby';
        gameState.players = [];
        gameState.currentQuestionIndex = -1;
        gameState.answersReceivedThisRound = 0;
        gameState.usedQuestions = [];
        console.log('Igra resetovana - nema ljudskih igrača');
        io.emit('game_reset', 'Igra je resetovana jer su svi igrači napustili.');
    }
}
setInterval(checkForHumanPlayers, 300000);

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
            lastAnswerIndex: null,
            isBot: false
        };
        
        gameState.players.push(newPlayer);
        console.log(`${newPlayer.name} se pridružio igri.`);
        
        if (gameState.players.length === 1) {
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
        
        // NOVO: provera prema gameState.lastQuestionCorrect (iz MongoDB) umesto iz niza
        const correctAnswer = gameState.lastQuestionCorrect; 
        
        player.lastAnswerCorrect = (answerIndex === correctAnswer);
        player.lastAnswerIndex = answerIndex; // pamti šta je igrač kliknuo
        
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

// Admin ruta za dodavanje pitanja (koristi POST zahtev)
app.post('/admin/add-questions', async (req, res) => {
    try {
        const questions = req.body;
        if (!Array.isArray(questions)) {
            return res.status(400).json({ error: 'Pošalji niz pitanja' });
        }
        const result = await Question.insertMany(questions);
        res.json({ message: `Dodato ${result.length} pitanja`, ids: result.map(r => r._id) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Force reset ruta - resetuje igru na zahtev
app.get('/admin/reset', (req, res) => {
    clearTimeout(gameState.roundTimer);
    clearTimeout(lobbyTimer);
    gameState.status = 'lobby';
    gameState.players = [];
    gameState.currentQuestionIndex = -1;
    gameState.answersReceivedThisRound = 0;
    gameState.usedQuestions = [];
    io.emit('game_reset', 'Igra je resetovana od strane admina.');
    res.json({ message: 'Igra je resetovana. Soba je prazna.' });
});
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server radi na portu ${PORT}`);
});
