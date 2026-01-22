import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Database with port
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT")
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")

    # Build connection string with port
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

    # App settings
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


config = Config()