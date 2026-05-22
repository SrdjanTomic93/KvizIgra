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
    {q: "Ko je napisao 'Proces'?", answers: ["Franc Kafka", "Herman Hese", "Tomas Man", "Robert Muzil"], correct: 0 },
    {q: "Šta je Pitagorina teorema?", answers: ["a² + b² = c²", "E = mc²", "F = ma", "V = IR"], correct: 0 },
    {q: "Koji je glavni grad Toga?", answers:  ["Abidžan", "Lome", "Najrobi", "Kinsaša"], correct: 1 },
    {q: "Osnivac stoicizma je ?", answers: ["Zenon", "Platon", "Niče", "Arhimed"], correct: 0 },
    { q: "Koji element je najzastupljeniji u Zemljinoj atmosferi?", answers: ["Kiseonik", "Ugljen-dioksid", "Azot", "Vodonik"], correct: 2 },
    {q: "Roman Dorucak kod Tifanija je pisao", answers: ["Bred Iston", "Truman Kapote", "Tes Geritsen", "Tomas Haris"], correct: 1 },
    {q: "Kolliko godina je trajao stogodisnji rat?", answers: ["116", "118", "87", "105"], correct: 0},
    {q: "Povrsinski gledano najmanja drzava Azije je ?", answers: ["Sri Lanka", "Singapur", "Brunej", "Maldivi"], correct: 3},
    { q: "Koji je najveći sisar na planeti?", answers: ["Afrički slon", "Plavi kit", "Žirafa", "Kit ajkula"], correct: 1 },
    { q: "Koliko ima nula u broju milion?", answers: ["3", "4", "5", "6"], correct: 3 },
    {q: "Medju rimski car od ponudjenih ne spada u tkz.dobre", answers: ["Nerva", "Trajan", "Hadrijan", "Konstantin"], correct: 3},
    {q: "Koji je glavni grad Nikaragve?", answers: ["Managva", "Asonsion", "Port taun", "Tegucigalpa"], correct: 0 },
    {q: "Koje godine je rodjen pisac Danilo Kiš?", answers: ["1925", "1935", "1945", "1955"], correct: 1 },
    {q: "Ko je napisao 'Stranca'?", answers: ["Žan-Pol Sartr", "Alber Kami", "Simon de Bovoar", "Marsel Prust"], correct: 1 },
    {q: "Merna jedinica za magnetni fluks je?", answers: ["Veber", "Henri", "Tesla", "Kulon"], correct: 0 },
    {q: "Ko je autor 'Države'?", answers: ["Aristotel", "Sokrat", "Platon", "Seneka"], correct: 2 },
    { q: "Ko je prvi predložio teoriju evolucije prirodnom selekcijom (zajedno sa Darvinom)?", answers: ["Žan-Batist Lamark", "Alfred Rasel Volas", "Tomas Maltus", "Čarls Lajel"], correct: 1 },
    {q: "Koliko iznosi molarna masa vode (H₂O)?", answers: ["16 g/mol", "18 g/mol", "20 g/mol", "22 g/mol"], correct: 1 },
    {q: "Ko je bio kralj Franaka i prvi car Svetog rimskog carstva?", answers: ["Klodvig", "Karlo Martel", "Karlo Veliki", "Fridrih Barbarosa"], correct: 2 },
    {q: "Koja je najmanja kost u ljudskom telu?", answers: ["Čekić", "Nakovanj", "Uzengija", "Puž"], correct: 2 },
    {q: "Koji je glavni grad Tanzanije?", answers: ["Najrobi", "Dodoma", "Kampala", "Kigali"], correct: 1 },
    {q: "Ko je otkrio strukturu DNK?", answers: ["Darvin i Volas", "Mendel i Morgan", "Votson i Krik", "Paster i Koh"], correct: 2 },
    {q: "Koje godine je počela Francuska revolucija?", answers: ["1776", "1789", "1799", "1804"], correct: 1 },
    {q: "Šta je 'kogito ergo sum' na srpskom?", answers: ["Znam da ništa ne znam", "Mislim, dakle postojim", "Sve je broj", "Biti ili ne biti"], correct: 1 },
    {q: "Koji je drugi najveći kontinent na svetu?", answers: ["Severna Amerika", "Južna Amerika", "Afrika", "Azija"], correct: 2 },
    {q: "Koji je glavni grad Kanade?", answers: ["Toronto", "Vankuver", "Montreal", "Otava"], correct: 3 },
    {q: "Nama najbliza zvezda posle sunca je ?", answers: ["Proksima Kentauri", "Berndova zvezda ", "Vajs", "B-192"], correct: 0 },
    {q: "Tim koji je osvojio fudbalsko prvenstovo Jugoslavije za sezonu 1970/1971?", answers: ["Partizan", "Dinamo Zagreb", "Hajduk Split", "Vojvodina"], correct: 2},
    {q: "Koji je najbrži sisar na svetu?", answers: ["Lav", "Antilopa", "Gepard", "Konj"], correct: 2 },
    {q: "Koji je najviši planinski vrh Afrike?", answers: ["Atlas", "Drakensberg", "Kilimandžaro", "Kenija"], correct: 2 },
    {q: "Šta je predstavlja Hablova konstanta?", answers: ["Masu crne rupe", "Starost univerzuma", "Brzinu širenja svemira", "Gustinu tamne materije"], correct: 2 },
    {q: "Koliko traje mandat američkog senatora?", answers: ["2 godine", "4 godine", "6 godina", "8 godina"], correct: 2 },
    {q: "Šta je glavna funkcija mitohondrija u ćeliji?", answers: ["Sinteza proteina", "Skladištenje masti", "Proizvodnja ATP-a", "Razgradnja otrova"], correct: 2 },
    {q: "Koji naučnik je predložio heliocentrični model Sunčevog sistema?", answers: ["Ptolomej", "Kopernik", "Galilej", "Kepler"], correct: 1 },
    {q: "Ko je autor knjige 'Kratka istorija vremena'?", answers: ["Ričard Fajnman", "Karl Segan", "Stiven Hoking", "Nil Degras Tajson"], correct: 2 },
    {q: "Koji je glavni grad Ekvadora?", answers: ["Bogota", "Karakas", "Limu", "Kito"], correct: 3 },
    {q: "Koliko ima kraljeva u standardnom špilu karata?", answers: ["2", "3", "4", "6"], correct: 2 },
    {q: "Koliko ima bajtova u jednom megabajtu (tehnički tačno)?", answers: ["1000", "1024", "1048576", "1000000"], correct: 2 },
    {q: "Ko je naslikao 'Rođenje Venere'?", answers: ["Leonardo", "Mikelandjelo", "Botičeli", "Rafael"], correct: 2 },
    {q: "Koji je glavni grad Slovenije?", answers: ["Zagreb", "Sarajevo", "Ljubljana", "Podgorica"], correct: 2 },
    {q: "Koji naučnik je predložio heliocentrični model Sunčevog sistema?", answers: ["Ptolomej", "Kopernik", "Galilej", "Kepler"], correct: 1 },
    {q: "Koliko amandmana ima Ustav SAD (uključujući prvih deset Povelje o pravima)?", answers: ["10", "17", "27", "33"], correct: 2 },
    { q: "Ko je komponovao 'Mesečevu sonatu'?", answers: ["Mocart", "Bach", "Betoven", "Brams"], correct: 2 },
    { q: "Ko je naslikao Mona Lizu?", answers: ["Pikaso", "Van Gog", "Leonardo da Vinči", "Mikelanđelo"], correct: 2 },
    {q: "Ko je napisao 'Zov divljine'?", answers: ["Ernest Hemingvej", "Džek London", "Mark Tven", "Herman Melvil"], correct: 1 },
    {q: "Koji je najgušći element u prirodi?", answers: ["Olovo", "Zlato", "Platina", "Osmijum"], correct: 3 },
    {q: "U kojoj zemlji se nalazi regija Flandrija?", answers: ["Holandija", "Luksemburg", "Belgija", "Nemačka"], correct: 2 },
    {q: "Tvorac Talicnog Toma je ?", answers: ["Moris", "Kobe", "Fransao", "Eduard"], correct: 0 },
    {q: "Smrt u Veneciji je napisao?", answers: ["Herman Hese", "Vladimir Pistalo", "Tomas Man", "Agata Kristi"], correct: 2 },
    {q: "U kom veku je živela Jovanka Orleanka?", answers: ["13. vek", "14. vek", "15. vek", "16. vek"], correct: 2 },
    {q: "Koji je glavni grad Čilea?", answers: ["Santjago", "La Paz", "Lima", "Bogota"], correct: 0 },
    
    {q: "Od cijeg mleka se pravi kumis?", answers: ["kravljeg", "kamiljeg", "kozijeg", "kobiljeg"], correct: 3 },
    { q: "Koji je glavni grad Kambodže?", answers: ["Hanoj", "Vijentijan", "Pnom Pen", "Bangkok"], correct: 2 }, 
    { q: "Koliko elektrona ima atom ugljenika u neutralnom stanju?", answers: ["4", "6", "8", "12"], correct: 1 },
    { q: "Ko je bio prvi predsednik Južne Afrike posle aparthejda?", answers: ["Stiv Biko", "Nelson Mandela", "F. V. de Klerk", "Tabo Mbeki"], correct: 1 },
    { q: "Koje godine je potpisano primirje u Prvom svetskom ratu?", answers: ["1916", "1917", "1918", "1919"], correct: 2 },
    { q: "Koji je najdublji okeanski rov na svetu?", answers: ["Portorikanski", "Javanski", "Marijanski", "Tonga"], correct: 2 },
    { q: "Koji filozof je autor 'Kritike čistog uma'?", answers: ["Hjum", "Lok", "Kant", "Berkli"], correct: 2 },
    { q: "Šta je glavna jedinica nasleđivanja?", answers: ["Hromozom", "Protein", "Gen", "Ribozom"], correct: 2 },
    {q: "Kosinus ugla od 90 stepeni iznosi?", answers: ["0", "1", "beskonacno", "1/2"], correct: 0 },
    {q: "Kakve pesme je najvise pevala Vasilija Radojcic?", answers: ["narodne", "pop", "džez", "bluz"], correct: 0 },
    {q: "Koja od sestara Bronte je napisala roman Džejn Ejr?", answers: ["Šarlota", "Emili", "Ana", "nijedna"], correct: 0 },
    {q: "Kojoj porodici biljaka pripada kleka, glavni sastojak klekovače?", answers: ["bukava", "borova", "čempresa", "ruža"], correct: 2 },
    {q: "Roman Stepski vuk je napisao?", answers: ["Tomas Man", "Ljorka", "Ivo Andrić", "Herman Hese"], correct: 3 },
    {q: "Ko je bio prvi predsednik Praviteljstvujuščeg sovjeta serbskog?", answers: ["prota M.Nenadović", "Jakov Nenadović", "Karađorđe Petrović", "Branko Radičević"], correct: 0 },
    {q: "Po kom piću je popularno nazvana revolucija u Vojvodini 1988.godine?", answers: ["vinjaku", "bozi", "jogurtu", "čaju"], correct: 2 },
    { q: "Koja je najmanja država na svetu?", answers: ["Monako", "Vatikan", "San Marino", "Lihtenštajn"], correct: 1 },
    {q: "Koja reka se pominje u pesmi Sanja, grupe Alisa?", answers: ["Dunav", "Sava", "Morava", "Amazon"], correct: 0 },
    {q: "Za koji roman je Ernest Hemingvej 1953.godine dobio Pulicerovu nagradu?", answers: ["Za kim zvono zvoni", "Zbogom oružje", "Starac i more", "Snegovi Kilimandžara"], correct: 2 },
    {q: "Koji grad je domaćin manifestacije Mokranjčevi dani?", answers: ["Sombor", "Negotin", "Zaječar", "Požarevac"], correct: 1 },
    {q: "U kom veku je Henri Osmi vladao Engleskom?", answers: ["14.vek", "15.vek", "16.vek", "17.vek"], correct: 2 },
    {q: "U kojoj ulici živi Banamen?", answers: ["Akacija", "Bejker", "Visterija Lejn", "nema ulicu"], correct: 0 },
    {q: "Koja obala Australije izlazi na Veliki australijski zaliv?", answers: ["južna", "istočna", "zapadna", "severna"], correct: 0 },
    {q: "Koja planeta je najbliža Suncu?", answers: ["Venera", "Merkur", "Zemlja", "Mars"], correct: 1 },
    {q: "Ko je napisao 'Na Drini ćuprija'?", answers: ["Ivo Andrić", "Miloš Crnjanski", "Meša Selimović", "Dobrica Ćosić"], correct: 0 },
    {q: "Koji je najviši vrh na svetu?", answers: ["K2", "Mont Blan", "Kilimandžaro", "Mont Everest"], correct: 3 },
    {q: "Od čega se pravi staklo?", answers: ["Kamena", "Peska", "Drveta", "Plastike"], correct: 1 },
    { q: "Džeki Iks je proslavljeni?", answers: ["glumac", "automobilista", "ulični umetnik", "stilista"], correct: 1 },
    { q: "U kojom od navedenih filmova ne glumi Hemfri Bogart?", answers: ["Kazablanka", "Blago Sijera Madre", "Afrička kraljica", "Pozovi M radi ubistva"], correct: 3 },
    { q: "U kom filmu ne glumi Odri Hebert?", answers: ["Sabrina", "Doručak kod Tifanija", "Praznik u Rimu", "Desilo se jedne noći"], correct: 3 },
    { q: "Koji gas udišemo da bismo preživeli?", answers: ["Ugljen-dioksid", "Azot", "Helijum", "Kiseonik"], correct: 3 },
    { q: "Koje ime dele glumici Selek,Skerit i Berindžer?", answers: ["Tom", "Sem", "Džim", "Džon"], correct: 0 },
    { q: "Koja Verdijeva opera je zasnovana na romanu Dama s kamelijama?", answers: ["Trubadur", "Travijata", "Rigoleto", "Nabuko"], correct: 1 },
    { q: "Mrtve duše je napisao?", answers: ["Tolstoj", "Dostojevski", "Bulgarski", "Gogolj"], correct: 3 },
    { q: "Vajfertovu pivaru vezujemo za koji grad?", answers: ["Pančevo", "Apatin", "Negotin", "Čelarevo"], correct: 0 },
    { q: "Prvu biografiju Vuka Karađžića napisao je?", answers: ["Ljubomir Stojanović", "Izmail Sreznjevski", "Miodrag Popović", "Branko Radičević"], correct: 1 },
    { q: "Vakslerova skala se koristi za merenje ?", answers: ["stepena zagađenosti vazduha", "stope razvoda brakova", "vazdušnog pritiska", "koeficijenta inteligencije"], correct: 3 },
    { q: "15 procenata od 350?", answers: ["48.5", "52.5", "57.5", "62"], correct: 1 },
    { q: "Tajnu večeru je naslikao ?", answers: ["Da Vinči", "Mikelanđelo", "Karavađo", "Rafaelo"], correct: 0 },
    { q: "pesmu Kad spavaš sam izvodi?", answers: ["Bajaga", "Yu grupa", "Kerber", "Smak"], correct: 3 },
    { q: "Ko je autor 'Uspona i pada Rimskog carstva'?", answers: ["Edvard Gibon", "Arnold Tojnbi", "Herodot", "Plutarh"], correct: 0 },
    { q: "Šta je glavna funkcija mitohondrija u ćeliji?", answers: ["Sinteza proteina", "Skladištenje masti", "Proizvodnja ATP-a", "Razgradnja otrova"], correct: 2 },
    { q: "Ko je naslikao 'Guernicu'?", answers: ["Salvador Dali", "Hoan Miro", "Pablo Pikaso", "Francisko Goja"], correct: 2 },
    { q: "Koliko iznosi brzina svetlosti u vakuumu (približno)?", answers: ["300.000 km/h", "300.000 km/s", "3.000.000 km/s", "30.000 km/s"], correct: 1 },
    { q: "Koji je glavni grad Letonije?", answers: ["Viljnus", "Talin", "Riga", "Helsinki"], correct: 2 },
    
    { q: "Ako bi bilo koji pozitivan broj stepenovali sa nulom dobili bi?", answers: ["0", "1", "vrednost tog broja", "beskonačno"], correct: 1},
    { q: "Koji je najveći okean na svetu?", answers: ["Atlantski", "Indijski", "Tihi", "Južni"], correct: 2 },
    { q: "Ko je napisao 'Zločin i kazna'?", answers: ["Lav Tolstoj", "Fjodor Dostojevski", "Nikolaj Gogolj", "Ivan Turgenjev"], correct: 1 },
    { q: "Koji hemijski element ima simbol 'O'?", answers: ["Osmijum", "Kiseonik", "Olovo", "Oganeson"], correct: 1 },
    { q: "Koliko ima minuta u jednom danu?", answers: ["1440", "1240", "1640", "1340"], correct: 0 },
    { q: "Koja je najveća pustinja na svetu?", answers: ["Sahara", "Gobi", "Antarktička", "Kalahari"], correct: 2 },
    { q: "Ko je naslikao 'Zvezdanu noć'?", answers: ["Pikaso", "Rembrant", "Van Gog", "Mone"], correct: 2 },
    { q: "Koji je najduži rečni sistem na svetu?", answers: ["Nil", "Amazon", "Jangce", "Misisipi"], correct: 0 },
    { q: "U kojoj godini je pao Berlinski zid?", answers: ["1987", "1988", "1989", "1990"], correct: 2 },
    { q: "Koji vitamin se dobija od sunčeve svetlosti?", answers: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin B12"], correct: 2 },
    { q: "Koji je najmanji kontinent?", answers: ["Evropa", "Južna Amerika", "Antarktik", "Australija"], correct: 3 },
    { q: "Ko je bio prvi predsednik SAD?", answers: ["Tomas Džeferson", "Abraham Linkoln", "Džordž Vašington", "Bendžamin Frenklin"], correct: 2 },
    { q: "Koliko ima sekundi u jednom satu?", answers: ["360", "3600", "60", "600"], correct: 1 },
    { q: "Koji je najviši vodopad na svetu?", answers: ["Viktorijini", "Nijagarini", "Anđeoski", "Iguasu"], correct: 2 },
    { q: "Koji grčki bog je bio vladar podzemlja?", answers: ["Zevs", "Posejdon", "Had", "Ares"], correct: 2 },
    { q: "Koji je hemijski simbol za srebro?", answers: ["S", "Sr", "Si", "Ag"], correct: 3 },
    { q: "U kojoj zemlji se nalazi Maču Pikču?", answers: ["Kolumbija", "Peru", "Brazil", "Argentina"], correct: 1 },
    { q: "Ko je otkrio penicilin?", answers: ["Luj Paster", "Robert Koh", "Aleksandar Fleming", "Hauard Floraj"], correct: 2 },
    { q: "Koliko ima dana u redovnoj godini?", answers: ["364", "365", "366", "360"], correct: 1 },
    { q: "Kako se zove najveća kost u ljudskom telu?", answers: ["Lobanja", "Karlica", "Butna kost", "Rebro"], correct: 2 },
    { q: "Koji je glavni grad Grčke?", answers: ["Solun", "Larisa", "Atina", "Patra"], correct: 2 },
    { q: "Ko je napisao 'Gordost i predrasude'?", answers: ["Šarlota Bronte", "Emili Bronte", "Džejn Ostin", "Virdžinija Vulf"], correct: 2 },
    { q: "Koji je najbrži sisar na svetu?", answers: ["Lav", "Antilopa", "Gepard", "Konj"], correct: 2 },
    { q: "Koliko iznosi broj π (pi) zaokružen na dve decimale?", answers: ["3.12", "3.14", "3.16", "3.18"], correct: 1 },
    { q: "Koja zemlja je poznata kao 'Zemlja hiljadu jezera'?", answers: ["Švedska", "Norveška", "Finska", "Kanada"], correct: 2 },
    { q: "Ko je bio otac psihoanalize?", answers: ["Karl Jung", "Alfred Adler", "Ivan Pavlov", "Sigmund Frojd"], correct: 3 },
    { q: "Koji je najveći sisar na planeti?", answers: ["Afrički slon", "Plavi kit", "Žirafa", "Kit ajkula"], correct: 1 },
    { q: "Koliko ima nula u broju milion?", answers: ["3", "4", "5", "6"], correct: 3 },
    { q: "Koji je glavni grad Australije?", answers: ["Sidnej", "Melburn", "Kambera", "Pert"], correct: 2 },
    { q: "Koja je najmanja država na svetu?", answers: ["Monako", "Vatikan", "San Marino", "Lihtenštajn"], correct: 1 },
    { q: "Ko je napisao 'Ilijadu' i 'Odiseju'?", answers: ["Sofokle", "Homer", "Euripid", "Aristotel"], correct: 1 },
    { q: "Koji element je najzastupljeniji u Zemljinoj atmosferi?", answers: ["Kiseonik", "Ugljen-dioksid", "Azot", "Vodonik"], correct: 2 },
    { q: "Koliko ima dana u februaru tokom prestupne godine?", answers: ["28", "29", "30", "31"], correct: 1 },
    { q: "Koja je najveća životinja na kopnu?", answers: ["Nosorog", "Nilski konj", "Afrički slon", "Polarni medved"], correct: 2 },
    { q: "Ko je bio poslednji faraon Egipta?", answers: ["Ramzes II", "Tutankamon", "Kleopatra", "Nefertiti"], correct: 2 },
    { q: "Koliko sati traje jedan dan na Zemlji?", answers: ["12", "18", "24", "36"], correct: 2 },
    { q: "Koji je glavni grad Italije?", answers: ["Napulj", "Milano", "Firenca", "Rim"], correct: 3 },
    { q: "Kako se zove proces kojim biljke prave hranu?", answers: ["Disanje", "Fotosinteza", "Fermentacija", "Oksidacija"], correct: 1 },
    { q: "Koji je najmanji organ u ljudskom telu?", answers: ["Bubreg", "Slezina", "Epifiza", "Žučna kesa"], correct: 2 },
    { q: "Koliko ima kontinenata na Zemlji?", answers: ["5", "6", "7", "8"], correct: 2 },
    { q: "Koji je glavni grad Mađarske?", answers: ["Prag", "Beč", "Varšava", "Budimpešta"], correct: 3 },
    { q: "Koji sport se igra na Vimbldonu?", answers: ["Fudbal", "Kriket", "Tenis", "Golf"], correct: 2 },
    { q: "Koji kontinent je ujedno i država?", answers: ["Australija", "Evropa", "Afrika", "Antarktik"], correct: 0 },
    {q: "Koliko dana ima prestupna godina?", answers: ["364", "365", "366", "367"], correct: 2 }
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
    const playerResults = gameState.players.map(p => ({
    id: p.id,
    name: p.name,
    correct: p.lastAnswerCorrect,
    wasActive: p.active,
    // Ako je igrač odgovorio, šaljemo i njegov odgovor
    answerIndex: p.lastAnswerIndex !== undefined ? p.lastAnswerIndex : null
}));
    io.emit('round_results', {
        players: gameState.players,
    correctAnswerIndex: questions[gameState.currentQuestionIndex].correct,
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
    
    setTimeout(sendNextQuestion, 5000);
}
// Provera da li ima živih ljudi u igri
function checkForHumanPlayers() {
    const humanPlayers = gameState.players.filter(p => !p.isBot && p.connected);
    if (humanPlayers.length === 0 && gameState.status === 'playing') {
        // Nema ljudi, resetuj igru
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

// Proveri svakih 5 minuta
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
    player.lastAnswerIndex = answerIndex; // DODATO: pamti šta je igrač kliknuo
    
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

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server radi na portu ${PORT}`);

});
