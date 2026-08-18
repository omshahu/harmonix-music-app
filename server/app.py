import os
import re
import json
import yt_dlp
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, send_file, Response
from flask_cors import CORS
from database import read_db, write_db

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), '..', 'public')
STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static')
SONGS_DIR = os.path.join(STATIC_DIR, 'songs')
ARTWORK_DIR = os.path.join(STATIC_DIR, 'artwork')

os.makedirs(SONGS_DIR, exist_ok=True)
os.makedirs(ARTWORK_DIR, exist_ok=True)

app = Flask(__name__, static_folder=PUBLIC_DIR)
CORS(app)

YT_DL_OPTS = {
    'format': 'bestaudio[ext=m4a]/bestaudio/best',
    'quiet': True,
    'nocheckcertificate': True,
    'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'extractor_args': {
        'youtube': {
            'player_client': ['android', 'web']
        }
    }
}

# Helper function for Partial Content HTTP Range audio streaming
def send_audio_range(file_path):
    file_size = os.path.getsize(file_path)
    range_header = request.headers.get('Range', None)

    ext = os.path.splitext(file_path)[1].lower()
    content_type = 'audio/mp4' if ext in ['.m4a', '.mp4'] else ('audio/wav' if ext == '.wav' else ('audio/ogg' if ext == '.ogg' else 'audio/mpeg'))

    if not range_header:
        with open(file_path, 'rb') as f:
            data = f.read()
        resp = Response(data, 200, mimetype=content_type)
        resp.headers.add('Content-Length', str(file_size))
        resp.headers.add('Accept-Ranges', 'bytes')
        return resp

    byte_match = re.search(r'bytes=(\d+)-(\d+)?', range_header)
    start = int(byte_match.group(1)) if byte_match else 0
    end = int(byte_match.group(2)) if byte_match and byte_match.group(2) else file_size - 1

    if start >= file_size:
        return Response(status=416)

    length = end - start + 1
    with open(file_path, 'rb') as f:
        f.seek(start)
        data = f.read(length)

    resp = Response(data, 206, mimetype=content_type)
    resp.headers.add('Content-Range', f'bytes {start}-{end}/{file_size}')
    resp.headers.add('Content-Length', str(length))
    resp.headers.add('Accept-Ranges', 'bytes')
    return resp

# --- API ROUTES ---

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "app": "Harmonix YouTube Engine", "time": datetime.now().isoformat()})

# --- MULTI-USER AUTHENTICATION & GOOGLE LOGIN ---
@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not email or not username or not password:
        return jsonify({'error': 'Username, email, and password required'}), 400

    db = read_db()
    users = db.setdefault('users', [])

    if any(u['email'] == email for u in users):
        return jsonify({'error': 'Email is already registered'}), 400

    user_id = f"user_{int(datetime.now().timestamp() * 1000)}"
    new_user = {
        "id": user_id,
        "username": username,
        "email": email,
        "password": password,
        "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_id}",
        "createdAt": datetime.now().isoformat()
    }
    users.append(new_user)

    # Initialize empty Liked Songs playlist for new user
    db.setdefault('playlists', []).append({
        "id": f"pl_liked_{user_id}",
        "userId": user_id,
        "name": "Liked Songs",
        "isLikedSongs": True,
        "songIds": [],
        "createdAt": datetime.now().isoformat()
    })

    write_db(db)
    return jsonify({"message": "Registration successful", "user": new_user}), 201

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()

    db = read_db()
    users = db.get('users', [])
    user = next((u for u in users if u['email'] == email and u['password'] == password), None)

    if not user:
        return jsonify({'error': 'Invalid email or password'}), 401

    return jsonify({"message": "Login successful", "user": user})

@app.route('/api/auth/google', methods=['POST'])
def auth_google():
    data = request.json or {}
    email = data.get('email', '').strip().lower() or "user@gmail.com"
    username = data.get('username', '').strip() or email.split('@')[0].capitalize()

    db = read_db()
    users = db.setdefault('users', [])
    user = next((u for u in users if u['email'] == email), None)

    if not user:
        user_id = f"user_google_{int(datetime.now().timestamp() * 1000)}"
        user = {
            "id": user_id,
            "username": username,
            "email": email,
            "isGoogleUser": True,
            "avatar": f"https://api.dicebear.com/7.x/bottts/svg?seed={email}",
            "createdAt": datetime.now().isoformat()
        }
        users.append(user)

        # Initialize Liked Songs playlist for Google user
        db.setdefault('playlists', []).append({
            "id": f"pl_liked_{user_id}",
            "userId": user_id,
            "name": "Liked Songs",
            "isLikedSongs": True,
            "songIds": [],
            "createdAt": datetime.now().isoformat()
        })

        write_db(db)

    return jsonify({"message": "Google Login successful", "user": user})

@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    user_id = request.args.get('userId', 'user_demo')
    db = read_db()
    users = db.get('users', [])
    user = next((u for u in users if u['id'] == user_id), None)
    if not user and users:
        user = users[0]
    return jsonify({"user": user})

# --- YOUTUBE SEARCH ENDPOINT ---
@app.route('/api/search/youtube', methods=['GET'])
def search_youtube():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])

    opts = dict(YT_DL_OPTS)
    opts['extract_flat'] = 'in_playlist'

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(f"ytsearch12:{query}", download=False)
            results = []
            if 'entries' in info:
                for entry in info['entries']:
                    yt_id = entry.get('id')
                    if not yt_id: continue

                    title = entry.get('title') or 'Unknown Title'
                    artist = entry.get('uploader') or entry.get('channel') or 'Artist'

                    q_lower = (query + " " + title + " " + artist).lower()
                    lang = 'Hindi' if any(w in q_lower for w in ['hindi', 'arijit', 'pritam', 'shershaah', 'jawan', 'kesariya', 'bollywood', 't-series', 'jubin', 'shreya']) else ('Marathi' if any(w in q_lower for w in ['marathi', 'ajay', 'atul', 'sairat', 'zingaat', 'lavani', 'apsara', 'chandramukhi', 'zee music marathi']) else 'English')

                    song_obj = {
                        "id": f"yt_{yt_id}",
                        "ytId": yt_id,
                        "title": title,
                        "artist": artist,
                        "album": "YouTube Audio",
                        "language": lang,
                        "genre": "Ad-Free Real Audio",
                        "duration": entry.get('duration') or 180,
                        "audioUrl": f"/api/songs/stream/yt/{yt_id}",
                        "coverUrl": f"https://i.ytimg.com/vi/{yt_id}/hqdefault.jpg",
                        "lyrics": f"[00:02.00] {title}\n[00:10.00] 100% Real Audio Streamed Ad-Free on Harmonix",
                        "isYouTube": True
                    }
                    results.append(song_obj)
            return jsonify(results)
    except Exception as e:
        print("YouTube Search Error:", e)
        return jsonify({'error': str(e)}), 500

# --- YOUTUBE REAL AUDIO STREAM ENDPOINT ---
@app.route('/api/songs/stream/yt/<yt_id>', methods=['GET'])
def stream_youtube_audio(yt_id):
    for ext in ['.m4a', '.mp3', '.webm', '.wav', '.mp4']:
        p = os.path.join(SONGS_DIR, f"yt_{yt_id}{ext}")
        if os.path.exists(p):
            return send_audio_range(p)

    url = f"https://www.youtube.com/watch?v={yt_id}"
    out_path = os.path.join(SONGS_DIR, f"yt_{yt_id}.m4a")

    opts = dict(YT_DL_OPTS)
    opts['outtmpl'] = out_path

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])

        if os.path.exists(out_path):
            return send_audio_range(out_path)

        for ext in ['.m4a', '.mp3', '.webm', '.opus', '.mp4']:
            p = os.path.join(SONGS_DIR, f"yt_{yt_id}{ext}")
            if os.path.exists(p):
                return send_audio_range(p)

        return jsonify({'error': 'Audio download failed'}), 500
    except Exception as e:
        print("Stream error:", e)
        return jsonify({'error': str(e)}), 500

# --- REAL SONG FILE DOWNLOAD ENDPOINT ---
@app.route('/api/songs/download/<song_id>', methods=['GET'])
def download_song_file(song_id):
    try:
        if song_id.startswith('yt_'):
            yt_id = song_id.replace('yt_', '')
            file_path = None
            for ext in ['.m4a', '.mp3', '.webm', '.wav', '.mp4']:
                p = os.path.join(SONGS_DIR, f"yt_{yt_id}{ext}")
                if os.path.exists(p):
                    file_path = p
                    break

            if not file_path:
                url = f"https://www.youtube.com/watch?v={yt_id}"
                out_path = os.path.join(SONGS_DIR, f"yt_{yt_id}.m4a")
                opts = dict(YT_DL_OPTS)
                opts['outtmpl'] = out_path
                with yt_dlp.YoutubeDL(opts) as ydl:
                    ydl.download([url])
                if os.path.exists(out_path):
                    file_path = out_path

            if file_path and os.path.exists(file_path):
                return send_file(file_path, as_attachment=True, download_name=f"Harmonix_{yt_id}.m4a")

        db = read_db()
        song = next((s for s in db.get('songs', []) if s['id'] == song_id), None)
        title = song['title'] if song else song_id

        for ext in ['.m4a', '.mp3', '.wav', '.ogg']:
            p = os.path.join(SONGS_DIR, f"{song_id}{ext}")
            if os.path.exists(p):
                return send_file(p, as_attachment=True, download_name=f"{title}{ext}")

        return jsonify({'error': 'Audio file not found for download'}), 404
    except Exception as e:
        print("Download endpoint error:", e)
        return jsonify({'error': str(e)}), 500

# --- IN-APP DOWNLOADS LIBRARY (USER ISOLATED) ---
@app.route('/api/downloads', methods=['GET'])
def get_downloads():
    user_id = request.args.get('userId', 'user_demo')
    db = read_db()
    user_dls = [d for d in db.get('downloads', []) if d.get('userId') == user_id]
    return jsonify(user_dls)

@app.route('/api/downloads/add', methods=['POST'])
def add_to_downloads():
    data = request.json or {}
    song_id = data.get('songId')
    user_id = data.get('userId', 'user_demo')
    song_obj = data.get('song')

    if not song_id:
        return jsonify({'error': 'songId required'}), 400

    db = read_db()
    downloads = db.setdefault('downloads', [])

    existing = next((d for d in downloads if d['songId'] == song_id and d.get('userId') == user_id), None)
    if not existing:
        new_dl = {
            "id": f"dl_{int(datetime.now().timestamp())}",
            "userId": user_id,
            "songId": song_id,
            "song": song_obj,
            "downloadedAt": datetime.now().isoformat()
        }
        downloads.insert(0, new_dl)

        if song_obj:
            if not any(s['id'] == song_id for s in db.setdefault('songs', [])):
                db['songs'].insert(0, song_obj)

        write_db(db)
        return jsonify({'message': 'Added to downloads', 'download': new_dl})

    return jsonify({'message': 'Already downloaded', 'download': existing})

@app.route('/api/downloads/<song_id>', methods=['DELETE'])
def remove_from_downloads(song_id):
    user_id = request.args.get('userId', 'user_demo')
    db = read_db()
    db['downloads'] = [d for d in db.get('downloads', []) if not (d['songId'] == song_id and d.get('userId') == user_id)]
    write_db(db)
    return jsonify({'message': 'Removed from downloads'})

# --- SONGS CRUD (USER ISOLATED UPLOADS) ---
@app.route('/api/songs', methods=['GET'])
def get_songs():
    user_id = request.args.get('userId', 'user_demo')
    db = read_db()
    all_songs = db.get('songs', [])

    # Filter: Return YouTube/public songs + user's uploaded songs only!
    songs = [s for s in all_songs if s.get('isYouTube') or s.get('userId') == user_id or not s.get('userId')]

    search = request.args.get('search', '').strip().lower()
    genre = request.args.get('genre', '').strip().lower()
    language = request.args.get('language', '').strip().lower()

    if search:
        songs = [s for s in songs if search in s['title'].lower() or search in s['artist'].lower() or search in s.get('album','').lower() or search in s.get('language','').lower()]

    if genre:
        songs = [s for s in songs if s.get('genre','').lower() == genre]

    if language:
        songs = [s for s in songs if s.get('language','').lower() == language]

    return jsonify(songs)

@app.route('/api/songs/<song_id>', methods=['DELETE'])
def delete_song(song_id):
    user_id = request.args.get('userId', 'user_demo')
    db = read_db()

    song = next((s for s in db.get('songs', []) if s['id'] == song_id), None)
    if song and song.get('userId') and song.get('userId') != user_id:
        return jsonify({'error': 'Unauthorized to delete this song'}), 403

    db['songs'] = [s for s in db.get('songs', []) if s['id'] != song_id]
    db['downloads'] = [d for d in db.get('downloads', []) if d['songId'] != song_id]
    write_db(db)
    return jsonify({'message': 'Song deleted successfully'})

@app.route('/api/songs/stream/<song_id>', methods=['GET'])
def stream_audio(song_id):
    if song_id.startswith('yt_'):
        yt_id = song_id.replace('yt_', '')
        return stream_youtube_audio(yt_id)

    db = read_db()
    song = next((s for s in db.get('songs', []) if s['id'] == song_id), None)

    for ext in ['.m4a', '.mp3', '.wav', '.ogg']:
        file_path = os.path.join(SONGS_DIR, f"{song_id}{ext}")
        if os.path.exists(file_path):
            return send_audio_range(file_path)

    return jsonify({'error': 'Audio file not found'}), 404

# --- USER UPLOAD TRACK ---
@app.route('/api/songs/upload', methods=['POST'])
def upload_song():
    try:
        title = request.form.get('title')
        artist = request.form.get('artist')
        user_id = request.form.get('userId', 'user_demo')
        album = request.form.get('album', 'Single')
        genre = request.form.get('genre', 'Pop')
        lyrics = request.form.get('lyrics', '')

        if not title or not artist or 'audio' not in request.files:
            return jsonify({'error': 'Title, artist, and audio file are required'}), 400

        audio_file = request.files['audio']
        song_id = f"song_up_{int(datetime.now().timestamp())}"

        ext = os.path.splitext(audio_file.filename)[1] or '.mp3'
        audio_filename = f"{song_id}{ext}"
        audio_file.save(os.path.join(SONGS_DIR, audio_filename))

        cover_url = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80"
        if 'cover' in request.files and request.files['cover'].filename:
            cover_file = request.files['cover']
            cover_ext = os.path.splitext(cover_file.filename)[1] or '.jpg'
            cover_filename = f"{song_id}{cover_ext}"
            cover_file.save(os.path.join(ARTWORK_DIR, cover_filename))
            cover_url = f"/static/artwork/{cover_filename}"

        new_song = {
            "id": song_id,
            "userId": user_id,
            "title": title,
            "artist": artist,
            "album": album,
            "genre": genre,
            "duration": 180,
            "audioUrl": f"/api/songs/stream/{song_id}",
            "coverUrl": cover_url,
            "lyrics": lyrics,
            "createdAt": datetime.now().isoformat()
        }

        db = read_db()
        db["songs"].insert(0, new_song)
        write_db(db)

        return jsonify({'message': 'Track uploaded successfully', 'song': new_song}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- PLAYLISTS & FOLDERS (USER ISOLATED) ---
@app.route('/api/playlists', methods=['GET', 'POST'])
def handle_playlists():
    db = read_db()
    user_id = request.args.get('userId') or (request.json.get('userId') if request.json else 'user_demo')

    if request.method == 'GET':
        user_playlists = [p for p in db.get('playlists', []) if p.get('userId') == user_id]
        return jsonify(user_playlists)

    data = request.json or {}
    new_p = {
        "id": f"pl_{int(datetime.now().timestamp())}",
        "name": data.get('name', 'New Playlist'),
        "userId": user_id,
        "songIds": data.get('songIds', []),
        "coverUrl": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
        "createdAt": datetime.now().isoformat()
    }
    db.setdefault('playlists', []).append(new_p)
    write_db(db)
    return jsonify(new_p), 201

@app.route('/api/playlists/<playlist_id>', methods=['DELETE'])
def delete_playlist(playlist_id):
    user_id = request.args.get('userId', 'user_demo')
    db = read_db()
    db['playlists'] = [p for p in db.get('playlists', []) if not (p['id'] == playlist_id and p.get('userId') == user_id)]
    write_db(db)
    return jsonify({'message': 'Playlist deleted'})

@app.route('/api/folders', methods=['GET', 'POST'])
def handle_folders():
    db = read_db()
    user_id = request.args.get('userId') or (request.json.get('userId') if request.json else 'user_demo')

    if request.method == 'GET':
        user_folders = [f for f in db.get('folders', []) if f.get('userId') == user_id]
        return jsonify(user_folders)

    data = request.json or {}
    new_f = {
        "id": f"fold_{int(datetime.now().timestamp())}",
        "name": data.get('name', 'New Folder'),
        "userId": user_id,
        "songIds": [],
        "playlistIds": [],
        "createdAt": datetime.now().isoformat()
    }
    db.setdefault('folders', []).append(new_f)
    write_db(db)
    return jsonify(new_f), 201

@app.route('/api/folders/<folder_id>', methods=['PUT', 'DELETE'])
def update_folder(folder_id):
    user_id = request.args.get('userId') or (request.json.get('userId') if request.json else 'user_demo')
    db = read_db()
    folders = db.get('folders', [])
    folder = next((f for f in folders if f['id'] == folder_id and f.get('userId') == user_id), None)
    if not folder: return jsonify({'error': 'Folder not found'}), 404

    if request.method == 'DELETE':
        db['folders'] = [f for f in folders if f['id'] != folder_id]
        write_db(db)
        return jsonify({'message': 'Folder deleted'})

    data = request.json or {}
    if 'name' in data: folder['name'] = data['name']
    write_db(db)
    return jsonify(folder)

@app.route('/api/folders/<folder_id>/songs', methods=['POST'])
def toggle_folder_song(folder_id):
    data = request.json or {}
    user_id = data.get('userId', 'user_demo')
    song_id = data.get('songId')

    db = read_db()
    folders = db.get('folders', [])
    folder = next((f for f in folders if f['id'] == folder_id and f.get('userId') == user_id), None)
    if not folder: return jsonify({'error': 'Folder not found'}), 404

    if song_id in folder.setdefault('songIds', []):
        folder['songIds'].remove(song_id)
    else:
        folder['songIds'].append(song_id)

    write_db(db)
    return jsonify(folder)

@app.route('/api/songs/like/<song_id>', methods=['POST'])
def toggle_like(song_id):
    data = request.json or {}
    user_id = data.get('userId', 'user_demo')

    db = read_db()
    playlists = db.get('playlists', [])
    liked_pl = next((p for p in playlists if p.get('isLikedSongs') and p.get('userId') == user_id), None)

    if not liked_pl:
        liked_pl = {
            "id": f"pl_liked_{user_id}",
            "userId": user_id,
            "name": "Liked Songs",
            "isLikedSongs": True,
            "songIds": []
        }
        playlists.append(liked_pl)

    if song_id in liked_pl['songIds']:
        liked_pl['songIds'].remove(song_id)
    else:
        liked_pl['songIds'].append(song_id)

    write_db(db)
    return jsonify({"likedSongIds": liked_pl['songIds']})

@app.route('/api/artists', methods=['GET'])
def get_artists():
    db = read_db()
    return jsonify(db.get('artists', []))

@app.route('/api/albums', methods=['GET'])
def get_albums():
    db = read_db()
    return jsonify(db.get('albums', []))

@app.route('/static/<path:filename>')
def serve_static_assets(filename):
    return send_from_directory(STATIC_DIR, filename)

@app.route('/')
def serve_index():
    return send_from_directory(PUBLIC_DIR, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    file_path = os.path.join(PUBLIC_DIR, path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(PUBLIC_DIR, path)
    return send_from_directory(PUBLIC_DIR, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print(f"[SERVER] Starting Harmonix Multi-User YouTube Audio Streaming Engine on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
