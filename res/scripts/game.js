const API_BASE_URL = "http://localhost:8000";

const game = {
    map: null,
    streetView: null,
    userMarker: null,
    ansMarker: null,
    ansPin: null,
    ansLoc: null,
    line: null,
    pin2d: false,
};
function smoothRedirect(url) {
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

let appState = JSON.parse(localStorage.getItem('appState'));
console.log(appState)

// Инициализации

async function initMap() {
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

    attachUIEvents();
    updateStreetView();
}

function attachUIEvents() {
    document.getElementById('leave').addEventListener('click', () => {

        localStorage.setItem('uiState', 'menu-screen');
        smoothRedirect('/')
        //window.location.href = 'index.html';

    });


    document.getElementById("guess").addEventListener("click", resultGame);
    document.getElementById("next").addEventListener("click", resetGame);

    const map = document.getElementById("map");

    map.addEventListener('dblclick', () => { if (!game.pin2d) map.classList.add('bigger') });
    map.addEventListener('mouseleave', () => { if (!game.pin2d) map.classList.remove('bigger') });
}
let phrases = null;

async function loadPhrases() {
    const res = await fetch('../../res/frase.json');
    phrases = await res.json();
}

loadPhrases();


// Игровая логика

function updateStreetView() {
    const coords = getRandomCoords();
    const svService = new google.maps.StreetViewService();
    showGameUI('search');

    svService.getPanorama({ location: coords, radius: 5000 }, (data, status) => {
        if (status === google.maps.StreetViewStatus.OK) {
            game.ansLoc = data.location.latLng;
            game.streetView.setPosition(game.ansLoc);
            showGameUI('guess');
            console.log('нашлась панорама')
        } else {
            console.log("нет панорамы");
            updateStreetView();
        }
    });
}

function resultGame() {
    game.ansMarker = new google.maps.marker.AdvancedMarkerElement({
        map: game.map,
        position: game.ansLoc,
        gmpDraggable: false,
        content: game.ansPin.element,
        title: "This is answer lol",
    });

    drawLine(game.ansLoc, game.userMarker.position)
    game.map.setZoom(3);
    game.map.panTo(game.ansLoc);
    game.userMarker.gmpDraggable = false;

    let distance = google.maps.geometry.spherical.computeDistanceBetween(game.ansLoc, game.userMarker.position);
    // отправить км distance *10 и откруглить 
    sendDistance(distance);
    document.getElementById("frase").textContent = frase(distance / 1000)
    appState.score += scoreFromDistance(distance / 1000)
    appState.games++;
    localStorage.setItem('appState', JSON.stringify(appState));
    console.log(appState)


    if (distance < 1000) distance = distance + ' m';
    else if (distance < 100000) distance = (distance / 1000).toFixed(2) + ' km';
    else distance = (distance / 1000).toFixed(0) + ' km'
    document.getElementById("res-cover").classList.add('visible');
    document.getElementById("distance").textContent = distance;



    showGameUI('next');
}

async function sendDistance(variable) {
  try {
    const payload = Math.trunc(variable / 1000);
    const response = await fetch(`/api/soloResults?email=${appState.user}&distance=${payload}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

  } catch (error) {
    console.error('Ошибка при отправке результатов:', error);
  }
}

function resetGame() {
    appState = JSON.parse(localStorage.getItem('appState'));

    document.getElementById("res-cover").classList.remove('visible');
    game.userMarker.gmpDraggable = true;
    if (game.ansMarker) {
        game.ansMarker.map = null;
        game.ansMarker = null;
    }
    if (game.line) {
        game.line.setMap(null);
        game.line = null;
    }
    game.userMarker.position = { lat: 0, lng: 0 };
    game.map.setZoom(1);
    game.map.panTo(game.userMarker.position);
    game.streetView.setZoom(1);

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

            document.getElementById("games-count").textContent = appState.games;
            document.getElementById("score").textContent = appState.score;

            break;
        case 'guess':
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
            break;
    }
}

function getRandomCoords() {
    const lat = -90 + Math.random() * 180;
    const lng = -180 + Math.random() * 360;
    return { lat, lng };
}

function drawLine(a, b) {
    game.line = new google.maps.Polyline({
        path: [a, b],
        strokeOpacity: 0,
        strokeColor: "#fff",
        icons: [{
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 1.5, fillOpacity: 0.5, strokeOpacity: 1 },
            offset: "0",
            repeat: "15px",
        }],
        map: game.map,
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
    console.log(x = Math.floor(Math.random() * list.length), list.length)
    return list[x];
}


function scoreFromDistance(distance) {
    mx = 1000
    let score = Math.round(mx * Math.exp(-distance / 1000));
    console.log(distance, score);

    return score;
}

//initMap();