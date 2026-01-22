// Получаем параметры из URL
const urlParams = new URLSearchParams(window.location.search);
const lobbyId = urlParams.get('lobby');
const isHost = urlParams.get('host') === 'true';

// параметры и состояния

const game = {
    map: null,
    streetView: null,
    userMarker: null,
    ansMarker: null,
    ansPin: null,
    ansLoc: null,
    players: [],
    pin2d: false,
    firstAns: false,
    panoId: null
};

let appState = JSON.parse(localStorage.getItem('appState'));
let phrases = null;
const defaultCoords = [{ lat: 56.85579951654341, lng: 60.60928861349073 },
{ lat: 52.649582917138396, lng: 59.57200213771839 },
{ lat: 22.268200851747338, lng: 114.18165355915593 },
{ lat: 45.75135435140489, lng: 21.229017727754133 },
{ lat: 36.2058375573225, lng: -115.98253991826802 },
{ lat: 51.758940, lng: -1.213139 },
{ lat: 51.206032, lng: -0.523820 },
{ lat: 14.10315377688974, lng: -15.545182101947846 },
{ lat: 35.87010014591649, lng: 140.04907400101646 },
{ lat: -33.27521248406271, lng: 148.015133145926 },
{ lat: 62.529648406525176, lng: 113.976881375484 },
];
let countUpdate = 0;

const PLACE_COLORS = [
    '#a3f5c8',
    '#7fd9f5',
    '#8abcf5',
    '#8f98ff',
    '#dc8fff',
    '#d06fd6',
    '#d46499',
    '#d46464',
    '#c0545a',
    '#a43838'
];

// сокет
let socket = null;
//const WS_URL = `ws://localhost:8000/ws/lobby/${lobbyId}`; // Адрес вебсокета
const WS_URL = `ws://localhost:8000/ws/lobby/${lobbyId}?email=${appState.user}`; //адрес вебсокета

function connectWebSocket() {
    //аутентификация
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log("WS Game connection established");
        updateStreetView();
    };

    socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
    };
}

function handleServerMessage(msg) {
    console.log("Сообщение от сервера:", msg);

    switch (msg.type) {
        case 'pano_id':
            console.log('PANO_IS I GOT', msg.pano_id)
            game.panoId = msg.pano_id;
            updateStreetViewPlayer();
            break;

        case 'first_ans':
            // startTimer(game_mp.js) получить сигнал кто-то ответил {type: first_ans}
            if (!game.firstAns) { // Если мы еще не запустили таймер сами
                console.log("Кто-то ответил первым, запускаем таймер");
                startTimer();
            }
            break;

        case 'round_result':
            // type: ‘round_result’, results: [ {name, coord, ...}, ... ]
            // Сохраняем/отображаем результаты
            resultGame(msg.results);
            break;

        case 'game_reset':
            resetGame();
            break;
    }
}
connectWebSocket()
// Инициализации

function smoothRedirect(url) {
    localStorage.setItem('appState', JSON.stringify(appState));

    const fade = document.getElementById('fade');
    fade.classList.add('active');

    setTimeout(() => {
        window.location.href = url;
    }, 600);
}

window.addEventListener('load', () => {
    const fade = document.getElementById('fade');
    setTimeout(() => fade.classList.remove('active'), 50);
});

async function loadPhrases() {
    const res = await fetch('../../res/frase.json');
    phrases = await res.json();
}

async function initMap() {
    console.log('INIT MAP')
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    game.map = new Map(document.getElementById('map'), {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        mapId: '4504f8b37365c3d0',
    });

    const userPin = new google.maps.marker.PinElement({
        background: "#000",
        borderColor: "#fff",
        glyphColor: "#fff",
    });

    game.userMarker = new AdvancedMarkerElement({
        map: game.map,
        position: { lat: 0, lng: 0 },
        gmpDraggable: true,
        content: userPin.element,
        title: "You wanna guess",
    });

    game.ansPin = new google.maps.marker.PinElement({
        background: "#fff",
        borderColor: "#000",
        glyphColor: '#000',
    });

    game.map.addListener("click", (event) => {
        if (game.userMarker.gmpDraggable)
            game.userMarker.position = event.latLng;
    });

    game.streetView = new google.maps.StreetViewPanorama(
        document.getElementById("street-view"),
        {
            pov: { heading: 165, pitch: 0 },
            zoom: 1,
            disableDefaultUI: true,
            showRoadLabels: false,
            addressControl: false,
        }
    );
    //connectWebSocket();
    attachUIEvents();
    loadPhrases();
    //updateStreetView();
}

function attachUIEvents() {
    document.getElementById('leave').addEventListener('click', () => {

        localStorage.setItem('uiState', 'menu-screen');
        smoothRedirect('../../res/html/lobby.html')
        //window.location.href = 'index.html';

    });

    if (isHost) {
        document.querySelectorAll('.host-controls').forEach(x => x.classList.remove('hidden'))
    }

    document.getElementById("guess").addEventListener("click", clickGuess);
    document.getElementById("next").addEventListener("click", () => {
        //хост отправляет { type: 'game_reset', currentLobby: +appState.lobbyGames }
        socket.send(JSON.stringify({
            type: 'game_reset',
            currentLobby: +appState.lobbyGames
        }));
        resetGame();
    });

    const map = document.getElementById("map");

    map.addEventListener('dblclick', () => { if (!game.pin2d) map.classList.add('bigger') });
    map.addEventListener('mouseleave', () => { if (!game.pin2d) map.classList.remove('bigger') });
}

// Игровая логика

function updateStreetView() {
    countUpdate++;

    console.log('updateStreetView', isHost)
    const svService = new google.maps.StreetViewService();
    showGameUI('search');
    if (isHost) {
        let coords = getRandomCoords();
        if (countUpdate > 10) {
            coords = defaultCoords[Math.floor(Math.random() * defaultCoords.length)];
        }
        svService.getPanorama({ location: coords, radius: 5000 }, (data, status) => {
            if (status === google.maps.StreetViewStatus.OK) {
                game.ansLoc = data.location.latLng;
                game.streetView.setPosition(game.ansLoc);
                showGameUI('guess');

                //хост отправляет pano_id

                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'pano_id',
                        pano_id: data.location.pano,
                        currentLobby: appState.currentLobby
                    }));
                    console.log(data.location.pano)
                    // smoothRedirect вызывается в handleLobbyMessage когда сервер ответит всем game_started
                } else {
                    console.error("Socket not ready");
                }
                //хост отправляет pano_id

            } else {
                updateStreetView(); //если панорама не найдена
            }
        });
    }
    else {
        /*game.panoId='umcDun81PnfGiw05xxrTOA';
        updateStreetViewPlayer()*/
    }
}

function updateStreetViewPlayer() {
    // Инициируем загрузку панорамы для игрока
    const svService = new google.maps.StreetViewService();
    svService.getPanorama({ pano: game.panoId }, (data, status) => {
        if (status === google.maps.StreetViewStatus.OK) {
            game.ansLoc = data.location.latLng;
            console.log(game.streetView);
            game.streetView.setPosition(game.ansLoc);
            showGameUI('guess');
        }
    });
}

function clickGuess() {
    game.userMarker.gmpDraggable = false;
    // Если таймер еще не запущен
    if (!game.firstAns) {
        game.firstAns = true;
        //отправляем first_ans {type: first_ans, currentLobby:число}
        socket.send(JSON.stringify({
            type: 'first_ans',
            currentLobby: +appState.lobbyGames
        }));
        startTimer();
    }
    showGameUI('wait');
}

function startTimer() { //вызывается когда получили сообщение от сокета "кто-то запустил таймер" (наш ответ не первый)
    game.firstAns = true

    const timer = document.getElementById('timer')
    timer.classList.remove('hidden')
    let sec = +timer.textContent;

    const interval = setInterval(() => {
        sec--;
        timer.textContent = sec;

        if (sec <= 0) {
            clearInterval(interval);
            game.firstAns = false
            myResult();
            if (appState.isHost) {
                socket.send(JSON.stringify({
                    type: 'game_over',
                }));
            }
            //playersResults - получаем с сервера
            //playersResults = debugPlayersRes()
            //resultGame(playersResults);
        }
    }, 1000);
}

let _myRes = { name: appState.user, temp_score: 0 };
function myResult() {
    const pos = game.userMarker.position;


    let distance = Math.round(google.maps.geometry.spherical.computeDistanceBetween(game.ansLoc, game.userMarker.position));
    _myRes.coord = { lat: pos.lat, lng: pos.lng };
    //отправить на сервер lat lng
    socket.send(JSON.stringify({
        type: 'my_res',
        name: appState.user,
        lat: pos.lat,
        lng: pos.lng,
        distance: Math.round(distance / 100)
    }));
    console.log(appState.user, pos.lat, pos.lng, distance)
    document.getElementById("frase").textContent = frase(distance / 1000)
    appState.lobbyScore += scoreFromDistance(distance / 1000)
    appState.lobbyGames++;
    localStorage.setItem('appState', JSON.stringify(appState));

    document.getElementById("res-cover").classList.add('visible');
    document.getElementById("distance").textContent =
        distance < 1000 ? `${distance} m` : `${(distance / 1000).toFixed(1)} km`;
}

function resultGame(playersResults) {
    game.ansMarker = new google.maps.marker.AdvancedMarkerElement({
        map: game.map,
        position: game.ansLoc,
        gmpDraggable: false,
        content: game.ansPin.element,
        title: "This is answer lol",
    });

    game.map.setZoom(3);
    game.map.panTo(game.ansLoc);
    game.userMarker.gmpDraggable = false;

    const ranked = playersResults
        .map(player => {
            const distance = Math.round(google.maps.geometry.spherical.computeDistanceBetween(
                game.ansLoc,
                player.coord
            ));
            return { ...player, distance };
        })
        .sort((a, b) => a.distance - b.distance);

    addRating(ranked);
    addMarkeres(ranked);
    showGameUI('next');
}

function resetGame() {
    appState = JSON.parse(localStorage.getItem('appState'));

    document.getElementById("res-cover").classList.remove('visible');
    game.userMarker.gmpDraggable = true;
    if (game.ansMarker) game.ansMarker.map = null;

    game.players.forEach(p => {
        p.marker.setMap(null);
        p.line.setMap(null);
    });

    game.players = [];
    game.userMarker.position = { lat: 0, lng: 0 };
    game.map.setZoom(1);
    game.map.panTo(game.userMarker.position);
    game.streetView.setZoom(1);
    game.firstAns = false;
    game.panoId = null;
    updateStreetView();
}

// UI и вспомогательные функции

function showGameUI(stage) {
    switch (stage) {
        case 'search':
            document.getElementById('map3d').classList.add('blur');
            document.getElementById("guess").classList.remove('hidden');
            document.getElementById("guess").disabled = true;
            document.getElementById('street-view').querySelectorAll('table').forEach((t) => t.parentElement.classList.add('hidden'));
            document.getElementById('map').querySelectorAll('table').forEach((t) => t.parentElement.classList.add('hidden'));
            document.getElementById('search').classList.remove('hidden');
            document.getElementById('panorama-overlay').classList.remove('dark')
            document.getElementById("map").classList.remove('bigger')

            document.getElementById("games-count").textContent = appState.lobbyGames;
            document.getElementById("score").textContent = appState.lobbyScore;

            break;
        case 'guess':
            //debugOtherAnsFirst() // ЭМУЛЯЦИЯ УДАЛИТЬ

            game.pin2d = false;
            document.getElementById('map3d').classList.remove('blur');
            document.getElementById('map3d').classList.remove('hidden');
            document.getElementById("guess").disabled = false;
            document.getElementById('search').classList.add('hidden');
            break;
        case 'next':
            document.getElementById('panorama-overlay').classList.add('dark')
            game.pin2d = true;
            document.getElementById("map").classList.add('bigger')
            document.getElementById("guess").classList.add('hidden');
            const timer = document.getElementById('timer')
            timer.classList.add('hidden');
            timer.textContent = 15;

            if (!isHost)
                //debugHostNextGame()
                break;
        case 'wait':
            document.getElementById("guess").disabled = true;
        //game.pin2d = true;
    }
}

function addRating(ranked) {
    const liders = document.getElementById('liders');
    liders.innerHTML = '';
    ranked.slice(0, 3).forEach((player, index) => {
        const div = document.createElement('div');
        div.className = 'lider';
        //div.style.borderLeft = `6px solid ${PLACE_COLORS[index]}`;
        let dist = player.distance < 1000 ? `${player.distance} m` : `${(player.distance / 1000).toFixed(1)} km`;
        div.innerHTML = `
            <span class="icon"><div class="color" style="background-color: ${PLACE_COLORS[index]}"></div></span>
            <div style="justify-content: left;">${player.name}</div>
            <div style="justify-content: center;">${appState.lobbyScore}</div>
            <div style="justify-content: right;">${dist}</div>
        `;
        liders.appendChild(div);
    });
}

function addMarkeres(ranked) {
    ranked.forEach((player, index) => {
        const color = PLACE_COLORS[index] || '#999';

        const pin = createPlayerPin(color);

        const marker = new google.maps.marker.AdvancedMarkerElement({
            map: game.map,
            position: player.coord,
            content: pin.element,
            title: player.name,
        });

        const line = drawLine(game.ansLoc, player.coord, color);

        game.players.push({ marker, line });
    });
}

function frase(distanceKm) {
    if (!phrases) return "";

    const keys = Object.keys(phrases)
        .filter(k => k !== "+")
        .map(Number)
        .sort((a, b) => a - b);
    let bucket = "+";
    for (const k of keys) {
        if (distanceKm <= k) {
            bucket = k;
            break;
        }
    }
    const list = phrases[bucket];
    x = Math.floor(Math.random() * list.length);
    return list[x];
}

function scoreFromDistance(distance) {
    mx = 1000
    let score = Math.round(mx * Math.exp(-distance / 1000));

    return score;
}

function getRandomCoords() {
    const lat = -80 + Math.random() * 160;
    const lng = -180 + Math.random() * 360;
    return { lat, lng };
}
function createPlayerPin(color) {
    return new google.maps.marker.PinElement({
        background: color,
        borderColor: "#fff",
        glyphColor: "#fff",
    });
}

function drawLine(a, b) {
    return new google.maps.Polyline({
        path: [a, b],
        strokeOpacity: 0, // основной stroke скрыт
        icons: [{
            icon: {
                path: 'M 0,-1 0,1', // маленькая вертикальная черта
                strokeOpacity: 1,
                strokeColor: '#000',
                strokeWeight: 1,
            },
            offset: '0',
            repeat: '10px',
        }],
        map: game.map,
    });
}

// DEBUG эмуляции

function debugOtherAnsFirst() {
    setTimeout(() => { if (!game.firstAns) startTimer() }, 5000 * (1 + Math.random()))
}

function debugPlayersRes() {
    /*let playersResults = [
        { name: "qq2345", coord: getRandomCoords(), temp_score: 666 },
        { name: "smellydog356", coord: getRandomCoords(), temp_score: 20 },
        { name: "mclovin", coord: getRandomCoords(), temp_score: 52 },
        { name: "kristiana_F", coord: getRandomCoords(), temp_score: 120 },
        { name: "ivan_gamaz", coord: getRandomCoords(), temp_score: 67 },
        { name: "ribka_pickmi", coord: getRandomCoords(), temp_score: 17 }
    ]*/
    //playersResults.push(_myRes);//delete
    //console.log(playersResults)
    //return playersResults
}

function debugHostNextGame() {
    setTimeout(resetGame, 5000 * (1 + Math.random()))

}
initMap();
