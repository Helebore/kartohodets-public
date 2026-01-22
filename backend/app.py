import os
import sys
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="Kartohodets MP")

# Get paths
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)  # kartohodets_mp_draft folder

print(f"📁 Project root: {project_root}")
print(f"📁 Backend dir: {current_dir}")

# Mount static directories
app.mount("/res", StaticFiles(directory=os.path.join(project_root, "res")), name="res")
app.mount("/node_modules", StaticFiles(directory=os.path.join(project_root, "node_modules")), name="node_modules")

# Import and include API routes
try:
    from endpoints import auth
    from websocket import room_ws

    app.include_router(auth.router, prefix="/api")
    app.include_router(room_ws.router)
    print("✅ API and WebSocket routes loaded")
except Exception as e:
    print(f"❌ Failed to load routes: {e}")
    import traceback

    traceback.print_exc()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Serve HTML pages
@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_path = os.path.join(project_root, "index.html")
    if os.path.exists(index_path):
        with open(index_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    else:
        return HTMLResponse(content="<h1>index.html not found</h1>", status_code=404)


@app.get("/lobby", response_class=HTMLResponse)
async def serve_lobby():
    lobby_path = os.path.join(project_root, "res", "html", "lobby.html")
    if os.path.exists(lobby_path):
        with open(lobby_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    return HTMLResponse(content="<h1>Lobby page not found</h1>", status_code=404)


@app.get("/game", response_class=HTMLResponse)
async def serve_game():
    game_path = os.path.join(project_root, "res", "html", "game.html")
    if os.path.exists(game_path):
        with open(game_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    return HTMLResponse(content="<h1>Game page not found</h1>", status_code=404)


@app.get("/game_mp", response_class=HTMLResponse)
async def serve_game_mp():
    game_mp_path = os.path.join(project_root, "res", "html", "game_mp.html")
    if os.path.exists(game_mp_path):
        with open(game_mp_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    return HTMLResponse(content="<h1>Game MP page not found</h1>", status_code=404)


# API endpoints for frontend to check
@app.get("/api/status")
async def api_status():
    return {
        "status": "online",
        "frontend": "served from FastAPI",
        "backend": "running",
        "websocket": "available at /ws"
    }


# Health check
@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 50)
    print("🎮 Kartohodets MP Server Starting...")
    print("=" * 50)
    print(f"🌐 Frontend URL: http://localhost:8000")
    print(f"📚 API Docs:     http://localhost:8000/docs")
    print(f"🔌 WebSocket:    ws://localhost:8000/ws")
    print(f"📁 Static files served from: {project_root}")
    print("=" * 50 + "\n")

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
