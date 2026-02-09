import asyncio
from typing import Dict, List
from fastapi import WebSocket, Depends
from sqlalchemy import true, false
from sqlalchemy.orm import Session
from sqlalchemy.testing import db

from backend.models.database import get_db
from backend.services.room_service import RoomService
from backend.services.user_service import UserService
from backend.services.pano_service import PanoService


class ConnectionManager:
    def __init__(self):
        # lobby_code → список WebSocket соединений
        self.active_lobbies: Dict[int, List[WebSocket]] = {}
        # Храним историю сообщений для реконнекта {lobby_code: {state_key: message}}
        self.lobby_state: Dict[int, Dict[str, dict]] = {}
    async def connect_to_lobby(self, websocket: WebSocket, lobby_code: int, email: str, db: Session):
        UserService.add_user_to_room(db, email, lobby_code)

        if lobby_code not in self.active_lobbies:
            self.active_lobbies[lobby_code] = []
            self.lobby_state[lobby_code] = {}
            print(f"Created room {lobby_code} in manager")
        self.active_lobbies[lobby_code].append(websocket)
        print(self.active_lobbies)
        # Небольшая задержка для инициализации соединения
        await asyncio.sleep(0.1)

        players = RoomService.get_all_users(db, lobby_code)
        await websocket.send_json({
            "type": "init_lobby",
            "players": players
        })

        current_state = self.lobby_state.get(lobby_code, {})

        if "current_pano" in current_state:
            print(f"Resending pano to {email}")
            await websocket.send_json(current_state["current_pano"])

        if "first_ans" in current_state:
            print(f"Resending first_ans to {email}")
            await websocket.send_json(current_state["first_ans"])

        # Уведомляем всех в лобби о новом игроке
        await self.broadcast_to_lobby(lobby_code, {
            "type": "PlayerAdded",
            "text": email
            }
        )

    async def disconnect_from_lobby(self, websocket: WebSocket, lobby_code: int, email: str, db: Session):
        #UserService.zero_temp_score(db, email)
        #UserService.remove_user_from_room(db, email)
        
        if lobby_code in self.active_lobbies:
            if websocket in self.active_lobbies[lobby_code]:
                self.active_lobbies[lobby_code].remove(websocket)
            #Если лобби опустело чистим
            if not self.active_lobbies[lobby_code]:
                del self.lobby_state[lobby_code]
                pass


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
    
    async def generate_new_round(self, lobby_code: int, db: Session):
        # 1. Получаем панораму из сервиса
        pano = PanoService.get_random_pano(db)
        
        if not pano:
            print("ERROR: No panos found in DB!")
            return

        RoomService.update_pan_id(db, lobby_code, pano.pano_id)
        
        msg = {
           "type": 'pano_id',
           "pano_id": pano.pano_id,
        }

        if lobby_code not in self.lobby_state:
            self.lobby_state[lobby_code] = {}

        self.lobby_state[lobby_code] = {"current_pano": msg}

        print(f'Sending NEW PANO: {pano.pano_id} to lobby {lobby_code}')
        await self.broadcast_to_lobby(lobby_code, msg)

    async def handle_first_ans(self, lobby_code: int):
        msg = {"type": 'first_ans'}
        if lobby_code in self.lobby_state:
            self.lobby_state[lobby_code]["first_ans"] = msg
        await self.broadcast_to_lobby(lobby_code, {"type": 'first_ans'})

    async def handle_my_res(self, lobby_code: int, email: str, lat: float, lng: float, distance: int, db: Session):
        print(lat, lng)
        update = UserService.update_coord(db, email, lat, lng)
        if update == None:
            print('ломаемся', email, lat, lng)
        UserService.update_temp_score(db, email, distance)
        UserService.update_and_return_elo(db, email, distance)



    async def handle_game_reset(self, lobby_code: int):
        if lobby_code in self.lobby_state:
            self.lobby_state[lobby_code] = {}
        await self.broadcast_to_lobby(lobby_code, {"type": 'game_reset'})

    async def handle_game_over(self, lobby_code: int, db: Session):
        results = RoomService.get_all_users_with_coord_and_tempelo(db, lobby_code)
        message = {
            "type": 'round_result',
            "results": results
        }
        await self.broadcast_to_lobby(lobby_code, message)





connection_manager = ConnectionManager()