console.log('renderLobbyScreen')

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



appState = JSON.parse(localStorage.getItem('appState'));
appState.lobbyGames = 1;
appState.lobbyScore = 0;
console.log(appState)
document.getElementById('lobby-code-display').innerText = appState.currentLobby;

const earth = document.getElementById('players-markers');

let socket = null;
const WS_URL = `ws://localhost:8000/ws/lobby/${appState.currentLobby}?email=${appState.user}`; //адрес вебсокета

function connectLobbyWebSocket() {
    if (!appState.currentLobby) {
        console.error("Lobby ID is missing/null, cannot connect WS");
        return;
    }
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log("Connected to Lobby WS");
        socket.send(JSON.stringify({
            type: 'player_added',
            username: appState.user,
            lobby_code: appState.currentLobby
        }));
    };

    socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        handleLobbyMessage(msg);
    };

    socket.onclose = () => {
        console.log("Lobby WS closed");
    };
}

function handleLobbyMessage(msg) {
    switch (msg.type) {
        /*case 'PlayerAdded':
            //get notify_msg = { "type": "PlayerAdded", "text": "AnnaMarkova" }
            console.log("Новый игрок:", msg.text);
            if (appState.user != msg.text) addMarker(msg.text);
            break;*/

        case 'game_started':
            //получили game_started: true -- редирект
            console.log("Игра началась");
            if (appState.isHost) {
                smoothRedirect(`../../res/html/game_mp.html?lobby=${appState.currentLobby}&host=true`);
            }
            else {
                smoothRedirect(`../../res/html/game_mp.html?lobby=${appState.currentLobby}`);
            }
            break;
        //можно будет добавить чтоб предыдущих людей прорисовывать
        case 'init_lobby':
            // Сервер присылает массив имен: { type: 'init_lobby', players: ['player5', 'player2'] }
            msg.players.forEach(playerName => {
                if (appState.user != playerName) {
                    console.log("Игрок в лобби был:", playerName);
                    addMarker(playerName)
                }; // Рисуем всех, кто уже был
            });
            break;
    }
}

connectLobbyWebSocket();

function addMarker(playerName) {
    const marker = document.createElement('div')

    marker.textContent = playerName
    marker.classList.add('marker')

    const rad = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random());
    const mx = earth.clientWidth;

    const [x, y] = polarToDecar(rad, d, mx);
    marker.style.top = y + 'px';
    marker.style.left = x + 'px'

    const img = document.createElement('img');
    img.src = '../../res/img/marker.png';
    img.style.height = '30px';
    img.style.width = '19px';

    marker.appendChild(img)

    earth.appendChild(marker)
}

function polarToDecar(rad, d, mx) {
    let x = mx / 2 * (1 + d * Math.cos(rad))
    let y = mx / 2 * (1 + d * Math.sin(rad))
    return [x, y]
}



const startBtn = document.getElementById('btn-start-game');
const guestMsg = document.getElementById('guest-msg');

addMarker(appState.user)

if (appState.isHost) {
    startBtn.style.display = 'block';
    guestMsg.style.display = 'none';

    startBtn.onclick = () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'start_game',
                username: appState.user
            }));
            // smoothRedirect вызывается в handleLobbyMessage когда сервер ответит всем game_started
        } else {
            console.error("Socket not ready");
        }
        //smoothRedirect(`../../res/html/game_mp.html?lobby=${appState.currentLobby}&host=true`)

    };
} else {
    startBtn.style.display = 'none';
    guestMsg.style.display = 'block';

    /* Эмуляция:
    setTimeout(() => {
        smoothRedirect(`../../res/html/game_mp.html?lobby=${appState.currentLobby}`)
    }, 5000);
    
    */
}
//тут я запрос пока не добави
document.getElementById('btn-leave-lobby').addEventListener('click', () => {
    // Запрос: POST /api/lobby/leave
    appState.currentLobby = null;
    appState.isHost = false;
    appState.lobbyGames = 1;
    appState.lobbyScore = 0;

    localStorage.setItem('uiState', 'room-enter-screen');
    smoothRedirect('/')
    //window.location.href = 'index.html';

});

