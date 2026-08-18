import os
import json
from database import read_db, write_db

REAL_YT_TRACKS = [
    # Hindi
    {
        "id": "yt_BddP6PYo2gs",
        "ytId": "BddP6PYo2gs",
        "title": "Kesariya",
        "artist": "Arijit Singh, Pritam",
        "artistId": "art_arijit",
        "album": "Brahmāstra",
        "albumId": "alb_brahmastra",
        "language": "Hindi",
        "genre": "Bollywood Romantic",
        "duration": 268,
        "audioUrl": "/api/songs/stream/yt/BddP6PYo2gs",
        "coverUrl": "https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg",
        "lyrics": "[00:02.00] Mujhko kitna pyaar hai tumse...\n[00:10.00] Kesariya tera ishq hai piya...\n[00:20.00] Rang jaaun jo main haath lagaun...",
        "isYouTube": True
    },
    {
        "id": "yt_W-TE_Ys4iwM",
        "ytId": "W-TE_Ys4iwM",
        "title": "Tum Hi Ho",
        "artist": "Arijit Singh, Mithoon",
        "artistId": "art_arijit",
        "album": "Aashiqui 2",
        "albumId": "alb_aashiqui2",
        "language": "Hindi",
        "genre": "Bollywood Soulful",
        "duration": 262,
        "audioUrl": "/api/songs/stream/yt/W-TE_Ys4iwM",
        "coverUrl": "https://i.ytimg.com/vi/W-TE_Ys4iwM/hqdefault.jpg",
        "lyrics": "[00:02.00] Hum tere bin ab reh nahi sakte...\n[00:12.00] Tere bina kya wajood mera...\n[00:22.00] Kyun ki tum hi ho, ab tum hi ho...",
        "isYouTube": True
    },
    {
        "id": "yt_VAdGW7QDJiU",
        "ytId": "VAdGW7QDJiU",
        "title": "Chaleya",
        "artist": "Arijit Singh, Shilpa Rao",
        "artistId": "art_arijit",
        "album": "Jawan",
        "albumId": "alb_jawan",
        "language": "Hindi",
        "genre": "Pop Dance",
        "duration": 200,
        "audioUrl": "/api/songs/stream/yt/VAdGW7QDJiU",
        "coverUrl": "https://i.ytimg.com/vi/VAdGW7QDJiU/hqdefault.jpg",
        "lyrics": "[00:03.00] Ishq mein dil bana hai chaleya...\n[00:12.00] Teri raahon mein, teri baahon mein...",
        "isYouTube": True
    },

    # Marathi
    {
        "id": "yt_luhVm60Wiro",
        "ytId": "luhVm60Wiro",
        "title": "Zingaat",
        "artist": "Ajay-Atul",
        "artistId": "art_ajayatul",
        "album": "Sairat",
        "albumId": "alb_sairat",
        "language": "Marathi",
        "genre": "Folk Dance",
        "duration": 228,
        "audioUrl": "/api/songs/stream/yt/luhVm60Wiro",
        "coverUrl": "https://i.ytimg.com/vi/luhVm60Wiro/hqdefault.jpg",
        "lyrics": "[00:02.00] Usatun nighamala navin chhanda...\n[00:10.00] Zing zing zingaat! Zing zing zingaat!",
        "isYouTube": True
    },
    {
        "id": "yt_q64G51f28b4",
        "ytId": "q64G51f28b4",
        "title": "Apsara Aali",
        "artist": "Ajay-Atul, Shreya Ghoshal",
        "artistId": "art_ajayatul",
        "album": "Natarang",
        "albumId": "alb_natarang",
        "language": "Marathi",
        "genre": "Lavani Classical",
        "duration": 290,
        "audioUrl": "/api/songs/stream/yt/q64G51f28b4",
        "coverUrl": "https://i.ytimg.com/vi/q64G51f28b4/hqdefault.jpg",
        "lyrics": "[00:03.00] Aali thumkat naarat aali...\n[00:12.00] Apsara aali indrapuritun...",
        "isYouTube": True
    },

    # English
    {
        "id": "yt_4NRXx6U8ABQ",
        "ytId": "4NRXx6U8ABQ",
        "title": "Blinding Lights",
        "artist": "The Weeknd",
        "artistId": "art_weeknd",
        "album": "After Hours",
        "albumId": "alb_afterhours",
        "language": "English",
        "genre": "Synthpop",
        "duration": 200,
        "audioUrl": "/api/songs/stream/yt/4NRXx6U8ABQ",
        "coverUrl": "https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg",
        "lyrics": "[00:02.00] I've been tryna call...\n[00:16.00] I said, ooh, I'm blinded by the lights...",
        "isYouTube": True
    },
    {
        "id": "yt_JGwWNGJdvx8",
        "ytId": "JGwWNGJdvx8",
        "title": "Shape of You",
        "artist": "Ed Sheeran",
        "artistId": "art_edsheeran",
        "album": "Divide",
        "albumId": "alb_divide",
        "language": "English",
        "genre": "Pop",
        "duration": 233,
        "audioUrl": "/api/songs/stream/yt/JGwWNGJdvx8",
        "coverUrl": "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg",
        "lyrics": "[00:02.00] The club isn't the best place to find a lover...\n[00:18.00] I'm in love with the shape of you...",
        "isYouTube": True
    }
]

def seed_database():
    db = read_db()
    db["songs"] = REAL_YT_TRACKS
    write_db(db)
    print("[OK] Seeded database with active YouTube real audio tracks!")

if __name__ == '__main__':
    seed_database()
