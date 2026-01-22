import asyncio
from typing import Dict, List
from fastapi import WebSocket, Depends
from sqlalchemy import true, false
from sqlalchemy.orm import Session
from sqlalchemy.testing import db

from backend.models.database import get_db
from backend.services.room_service import RoomService
from backend.services.user_service import UserService


class ConnectionManager:
    def __init__(self):
        # lobby_code → список WebSocket соединений
        self.active_lobbies: Dict[int, List[WebSocket]] = {}
    async def connect_to_lobby(self, websocket: WebSocket, lobby_code: int, email: str, db: Session):
        UserService.add_user_to_room(db, email, lobby_code)

        if lobby_code not in self.active_lobbies:
            self.active_lobbies[lobby_code] = []
            print(f"Created room {lobby_code} in manager")
        self.active_lobbies[lobby_code].append(websocket)
        print(self.active_lobbies)
        # Небольшая задержка для инициализации соединения
        await asyncio.sleep(0.1)

        # Уведомляем всех в лобби о новом игроке
        await self.broadcast_to_lobby(lobby_code, {
            "type": "PlayerAdded",
            "text": email
            }
        )
        players = RoomService.get_all_users(db, lobby_code)
        print(players)
        await asyncio.sleep(0.1)
        await self.broadcast_to_lobby(lobby_code,{
            "type": "init_lobby",
            "players": players
        })

    async def disconnect_from_lobby(self, websocket: WebSocket, lobby_code: int, email: str, db: Session):
        UserService.zero_temp_score(db, email)
        UserService.remove_user_from_room(db, email)
        self.active_lobbies[lobby_code].remove(websocket)

    async def broadcast_to_lobby(self, lobby_code: int, message: dict):
        """Отправка сообщения всем в лобби с обработкой ошибок"""
        if lobby_code not in self.active_lobbies:
            return

        disconnected = []

        for connection in self.active_lobbies[lobby_code]:
            try:
                # Используем create_task для асинхронной отправки
                await connection.send_json(message)
            except Exception as e:
                print(f"Failed to send to connection: {e}")
                disconnected.append(connection)

        # Удаляем отключенные соединения
        for connection in disconnected:
            if connection in self.active_lobbies[lobby_code]:
                self.active_lobbies[lobby_code].remove(connection)

    async def handle_start_game(self, lobby_code: int):
        await self.broadcast_to_lobby(lobby_code, {"type": 'game_started'})

    async def handle_pano_id(self, lobby_code: int, pano_id: str, db: Session):
       RoomService.update_pan_id(db, lobby_code, pano_id)
       print('ПАНО АЙДИ ОТПРАВЛЯЕТСЯ')
       await self.broadcast_to_lobby(lobby_code, {
           "type": 'pano_id',
           "pano_id": pano_id
       })

    async def handle_first_ans(self, lobby_code: int):
        await self.broadcast_to_lobby(lobby_code, {"type": 'first_ans'})

    async def handle_my_res(self, lobby_code: int, email: str, lat: float, lng: float, distance: int, db: Session):
        print(lat, lng)
        update = UserService.update_coord(db, email, lat, lng)
        if update == None:
            print('ломаемся', email, lat, lng)
        UserService.update_temp_score(db, email, distance)
        UserService.update_and_return_elo(db, email, distance)



    async def handle_game_reset(self, lobby_code: int):
        await self.broadcast_to_lobby(lobby_code, {"type": 'game_reset'})

    async def handle_game_over(self, lobby_code: int, db: Session):
        results = RoomService.get_all_users_with_coord_and_tempelo(db, lobby_code)
        message = {
            "type": 'round_result',
            "results": results
        }
        await self.broadcast_to_lobby(lobby_code, message)





connection_manager = ConnectionManager()