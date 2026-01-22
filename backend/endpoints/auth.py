from fastapi import APIRouter, Depends
from backend.models.database import get_db
from backend.models.user import User
from backend.services.room_service import RoomService
from backend.services.user_service import UserService
from sqlalchemy.orm import Session

router = APIRouter()

@router.post("/email")
async def create_session(email: str, db: Session = Depends(get_db)):
    if not UserService.get_user_by_email(db, email):
        UserService.create_user(db, email)
    return


@router.get("/leaderboard")
async def get_leaderboard(email: str, db: Session = Depends(get_db)):
    return UserService.get_leaderboard_and_stats(db, email)


@router.post("/soloResults")
async def solo_game(distance: int, email: str, db: Session = Depends(get_db)):
    UserService.update_temp_score(db, email, distance)
    return UserService.update_and_return_elo(db, email, distance)

@router.post("/create/lobby")
async def create_lobby(email: str, db: Session = Depends(get_db)):
    room = RoomService.create_room(db, email)
    return {
        "lobbyCode": room.id
    }

@router.post("/lobby/{code}")
async def join_lobby(code: int, email: str, db: Session = Depends(get_db)):
    if RoomService.get_room_by_id(db, code):
        UserService.add_user_to_room(db, email, code)
    return



