const API_BASE_URL = "http://localhost:8000";
const CLIENT_ID = CONFIG.GOOGLE_CLIENT_ID;

// Состояние приложения
const appState = JSON.parse(localStorage.getItem('appState'))
    || {
    token: null,
    user: 'cool_user',
    currentLobby: null,
    isHost: false,
    lobbyGames: 1,
    lobbyScore: 0,
    games: 1,
    score: 0,
};
console.log(appState);

// Инициализация при загрузке страницы
window.onload = () => {

    checkLocalStorage();
    setupEventListeners();
    const uiState = localStorage.getItem('uiState'); // запмнинаем экран с которого уходили чтоб вернуться при переадресации туда же
    if (uiState) {
        showScreen(uiState);
        localStorage.removeItem('uiState');
    }
    loadLeaderboard()
};
window.addEventListener('load', () => {
    const fade = document.getElementById('fade');
    setTimeout(() => fade.classList.remove('active'), 50);
});


function smoothRedirect(url) {
    localStorage.setItem('appState', JSON.stringify(appState));

    const fade = document.getElementById('fade');
    fade.classList.add('active');

    setTimeout(() => {
        window.location.href = url;
    }, 600);
}


// --- Логика Аутентификации --- хз.. думайте

function checkLocalStorage() {
    const token = localStorage.getItem('token');
    if (token) {
        //token = email
        
        appState.user = token;
        showScreen('menu-screen');
        console.log("вход по токену");
        console.log(token);
    } else {
        // Токена нет, показываем логин
        initGoogleLogin();
        showScreen('login-screen');
        //что-то надо сделать с кнопкой гугла иногда она не рендерится
        //initGoogleLogin();
    }
}

/*function initGoogleLogin() {
    const container = document.getElementById("google-btn");
    container.innerHTML = '<button onclick="handleMockLogin()">sign in without google</button>';
}*/

function initGoogleLogin() {
    // Инициализация кнопки Google Auth (GIS)
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse//handleGoogleResponse
    });
    google.accounts.id.renderButton(
        document.getElementById("google-btn"),
        { theme: "outline", size: "large" }
    );
}

/*async function handleMockLogin() {
    const mockUsers = [
        "helebore", "smellydog356", "mclovin", 
        "kristiana_F", "ivan_gamaz", "ribka_pickmi", 
        "spdkun666", "azalkinmmm", "anna_mrkv", 
        "sweetevelyn"
    ];
    const username = mockUsers[Math.floor(Math.random() * mockUsers.length)];

    try {
        const apiResponse = await fetch(`${API_BASE_URL}/api/email?email=${encodeURIComponent(username)}`, {
            method: 'POST'
        });

        if (apiResponse.ok) {
            finalizeLogin(username);
        } else {
            console.error("Ошибка сервера:", apiResponse.status);
            // finalizeLogin(username); 
        }
    } catch (error) {
        console.error("Ошибка входа:", error);
    }
}

function finalizeLogin(username) {
    localStorage.setItem('token', username);
    appState.user = username;
    appState.token = username;
    console.log("Вход выполнен успешно");
    showScreen('menu-screen');
}*/

async function handleCredentialResponse(response) {
    try {
        // 1. Получаем email из токена Google
        const responsePayload = decodeJwtResponse(response.credential);
        console.log("!!!!!!!!!!!!!!!!!");
        const userEmail = responsePayload.email;
        const username = userEmail.split('@')[0];
        /*const mockUsers = [
        "helebore", "smellydog356", "mclovin", "kristiana_F", "ivan_gamaz",
        "ribka_pickmi", "spdkun666", "azalkinmmm", "anna_mrkv", "sweetevelyn"];    
        const username = mockUsers[Math.floor(Math.random() * mockUsers.length)];
        console.log(username);
        console.log(userEmail, username);*/
        // 2. Отправляем email на сервер
        const apiResponse = await fetch(`/api/email?email=${encodeURIComponent(username)}`, {
            method: 'POST'
        });

        // 3. Проверяем ответ сервера
        if (apiResponse.ok) {
            localStorage.setItem('token', username); //пока в токен просто username сохраняем потом поправлю
            appState.user = username;
            console.log("Вход выполнен успешно");
            showScreen('menu-screen');
            

        } else {
            console.error("Ошибка сервера:", apiResponse.status);
            throw new Error('Server rejected');
        }

    } catch (error) {
        console.error("Ошибка входа:", error);
        // Чистим на всякий случай
        appState.token = null;
        showScreen('login-screen');
    }
}

//расшифровываем гуглотокен
function decodeJwtResponse(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

function logout() {
    localStorage.removeItem('token');
    console.log('logout', localStorage)
    showScreen('login-screen');
}

// --- Логика Лидерборда ---

async function loadLeaderboard() {
    // Запрос: GET /api/leaderboard
    // Ожидаемый ответ: { user_stats: {...}, top_10: [...] }
    try {
        const response = await fetch(`${API_BASE_URL}/api/leaderboard?email=${appState.user}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const statsScreenData = await response.json();

        // Заполнение UI
        if (statsScreenData.user) {
            document.getElementById('stat-rank').innerText = statsScreenData.user.rank;
            document.getElementById('stat-score').innerText = statsScreenData.user.score;
            document.getElementById('stat-games').innerText = statsScreenData.user.games;
        }

        const body = document.getElementById('leaderboard-body');
        body.innerHTML = '';

        if (statsScreenData.top && Array.isArray(statsScreenData.top)) {
            statsScreenData.top.forEach((p, i) => {
                body.innerHTML += `
                <div class="row ${(i + 1) == statsScreenData.user.rank ? 'me' : ''}">
                  <div>${i + 1}. ${p.name}</div>
                  <div class="score">${Math.round(p.score)}</div>
                </div>`;
            });
        }

    } catch (error) {
        console.error("Ошибка при загрузке лидерборда:", error);
    }
    /* Эмуляция данных
       const mockData = {
           user: { rank: 6, score: 1912.34, accuracy: 63, games: 17 },
           top: [
               { name: "qq2345", score: 3524.19 },
               { name: "smellydog356", score: 3318.83 },
               { name: "mclovin", score: 3192.58 },
               { name: "kristiana_F", score: 2523.67 },
               { name: "ivan_gamaz", score: 2473.49 },
               { name: "cool_user", score: 1912.34 },
               { name: "sadkun666", score: 1882.47 },
               { name: "azalkinmmm", score: 1869.23 },
               { name: "anna_mrkv", score: 1742.13 },
               { name: "sweetevelyn", score: 1612.96 },
           ]
       };*/ 
}

// --- Логика Мультиплеера (Лобби) ---


function handleLobbyInput() {
    const inputs = [...document.querySelectorAll('.otp-input')];
    const btn = document.getElementById('btn-enter-lobby');
    let code = 0;
    inputs.forEach(x=>{code=code*10+x.value});
    console.log(code);
    btn.disabled = inputs.some(x => !(x.value && x.value >= 0 && x.value < 10));
}

async function joinLobby() {
    const input = document.querySelectorAll('.otp-input');
    let code = ''
    input.forEach(x => {
        code += x.value;
    });
    console.log(code)
    try {
        const response = await fetch(`${API_BASE_URL}/api/lobby/${code}?email=${appState.user}`, {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            appState.currentLobby = code;
            appState.isHost = false;
            renderLobbyScreen();
        }   else {
             console.error("Server returned:", response.status);
        }

    } catch (error) {
        console.error("Ошибка при проверке кода:", error);

    }
    console.log("Вход в лобби:", code);
    console.log(appState.currentLobby)
    console.log(appState.currentLobby)
}

async function createLobby() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/create/lobby?email=${appState.user}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log(response)
        const data = await response.json();
        const lobbyCode = data.lobbyCode;
        if (!lobbyCode) {
            throw new Error('no lobbyCode');
        }

        appState.isHost = true;
        appState.currentLobby = lobbyCode;
        renderLobbyScreen();

    } catch (error) {
        console.error("Ошибка при создании лобби:", error);
        /*appState.isHost = true;
        appState.currentLobby = 123123;*/

        //renderLobbyScreen();
    }
}


function renderLobbyScreen() { //renderLobbyScreen(lobbyId)
    //const newCode = Math.floor(100000 + Math.random() * 900000); // Эмуляция
    //console.log("Создано лобби:", newCode);
    //newCode менять на lobbyId
    //appState.currentLobby = newCode;
    smoothRedirect('../../res/html/lobby.html');
    //    smoothRedirect(`../../res/html/lobby.html?lobby=${appState.currentLobby}&host=true`);

    //window.location.href = 'lobby.html';
}
// --- Утилиты UI ---

function showScreen(screenId) {
    console.log('showScreen', screenId)

    const screens = ['loading-screen', 'login-screen', 'menu-screen', 'room-enter-screen'];
    screens.forEach(id => document.getElementById(id).style.display = 'none');

    document.getElementById(screenId).style.display = 'flex';
}

function setupEventListeners() {
    /*document.getElementById("google-btn").addEventListener('click', () => { //delete
        /*appState.user = 'player';
        const serverToken = "mock_server_token_" + Date.now();
        localStorage.setItem('kartohodets_token', serverToken);
        appState.token = serverToken;
        showScreen('menu-screen');
    })*/

    // Кнопки меню
    document.getElementById('btn-solo').addEventListener('click', () => {
        appState.games = 1;
        appState.score = 0;
        smoothRedirect('../../res/html/game.html')
        //window.location.href = 'game.html'; // Переход на соло игру
    });

    document.getElementById('btn-multi').addEventListener('click', () => {
        showScreen('room-enter-screen');
    });

    document.getElementById('btn-leaderboard').addEventListener('click', () => {
        //showScreen('leaderboard-screen');
        document.getElementById('leaderboard-screen').style.visibility = 'visible'
        document.getElementById('leaderboard-screen').style.opacity = 1;


        loadLeaderboard();
    });

    document.getElementById('btn-logout').addEventListener('click', logout);

    // Кнопки внутри экранов
    document.getElementById('btn-back-menu-lb').addEventListener('click', () => {
        //showScreen('menu-screen');
        document.getElementById('leaderboard-screen').style.visibility = 'hidden'
        document.getElementById('leaderboard-screen').style.opacity = 0;
    });
    document.getElementById('btn-back-menu-room').addEventListener('click', () => showScreen('menu-screen'));

    // Лобби
    document.getElementById('btn-enter-lobby').addEventListener('click', joinLobby);
    document.getElementById('btn-create-lobby').addEventListener('click', createLobby);

    // инпут id комнаты
    const inputs = document.querySelectorAll('.otp-input');
    console.log(inputs.length)

    function focusEnd(input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
    }

    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            input.value = input.value.replace(/\D/g, '').slice(-1);
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!', input.value)
            if (e.target.value.length === 1 && index < inputs.length - 1) {
                focusEnd(inputs[index + 1]);
            }
            handleLobbyInput()
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value.length === 0 && index > 0) {
                focusEnd(inputs[index - 1]);
            }
            if (e.key === 'ArrowLeft' && index > 0) {
                e.preventDefault();
                focusEnd(inputs[index - 1]);
            }

            if (e.key === 'ArrowRight' && index < inputs.length - 1) {
                e.preventDefault();
                focusEnd(inputs[index + 1]);
            }
        });
    });
}