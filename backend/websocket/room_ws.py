from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.orm import Session
from backend.models.database import get_db, SessionLocal
from backend.services.room_service import RoomService
from . import manager
from .manager import connection_manager
from backend.services.user_service import UserService

router = APIRouter()


@router.websocket("/ws/lobby/{lobby_code}")
async def lobby_websocket(
        websocket: WebSocket,
        lobby_code: int,
        email: str = Query(...)  # email из параметров запроса
):
    """WebSocket для взаимодействия в лобби"""
    await websocket.accept()
    db = SessionLocal()

    # Проверяем что лобби существует
    room = RoomService.get_room_by_id(db, lobby_code)
    if not room:
        await websocket.close(code=1008, reason="Lobby not found")
        return

    # Получаем пользователя
    user = UserService.get_user_by_email(db, email)
    if not user:
        await websocket.close(code=1008, reason="User not found")
        return

    # Подключаем к менеджеру
    await connection_manager.connect_to_lobby(
        websocket=websocket,
        lobby_code=lobby_code,
        email=email,
        db=db
    )

    try:
        while True:
            data = await websocket.receive_json()

            # Обработка событий в лобби

            if data.get("type") == "start_game":
                await connection_manager.handle_start_game(lobby_code)

            elif data.get("type") == "pano_id":
                await connection_manager.handle_pano_id(lobby_code, data.get("pano_id"), db)
                print(data.get("pano_id"))

            elif data.get("type") == "first_ans":
                await connection_manager.handle_first_ans(lobby_code)

            elif data.get("type") == "my_res":
                await connection_manager.handle_my_res(lobby_code,
                                                       data.get("name"), data.get("lat"), data.get("lng"),
                                                       data.get("distance"), db
                                                       )
            elif data.get("type") == "game_reset":
                await connection_manager.handle_game_reset(lobby_code)

            elif data.get("type") == "game_over":
                await connection_manager.handle_game_over(lobby_code, db)

    except WebSocketDisconnect:
        await connection_manager.disconnect_from_lobby(websocket, lobby_code, email, db)
