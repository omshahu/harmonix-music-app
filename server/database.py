import os
import json
import uuid
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
DB_FILE = os.path.join(DATA_DIR, 'database.json')

os.makedirs(DATA_DIR, exist_ok=True)

DEFAULT_DATA = {
    "users": [
        {
            "id": "user_demo",
            "username": "Alex Harmony",
            "email": "alex@harmonix.com",
            "password": "demo",
            "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
            "createdAt": datetime.now().isoformat()
        }
    ],
    "songs": [],
    "artists": [],
    "albums": [],
    "playlists": [],
    "folders": [],
    "downloads": []
}

def read_db():
    if not os.path.exists(DB_FILE):
        write_db(DEFAULT_DATA)
        return DEFAULT_DATA
    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading database: {e}")
        return DEFAULT_DATA

def write_db(data):
    try:
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error writing database: {e}")
