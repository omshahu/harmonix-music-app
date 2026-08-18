import os
import json
import urllib.request
import urllib.parse
from database import read_db, write_db

STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static')
SONGS_DIR = os.path.join(STATIC_DIR, 'songs')
os.makedirs(SONGS_DIR, exist_ok=True)

# List of target real songs across Hindi, Marathi, and English
TARGET_SONGS = [
    {
        "id": "hin_1",
        "title": "Kesariya",
        "artist": "Arijit Singh, Pritam",
        "query": "Kesariya Brahmastra Arijit Singh mp3",
        "language": "Hindi",
        "genre": "Romantic",
        "album": "Brahmastra",
        "coverUrl": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
        "lyrics": "[00:02.00] Mujhko kitna pyaar hai tumse...\n[00:10.00] Kesariya tera ishq hai piya...\n[00:20.00] Rang jaaun jo main haath lagaun..."
    },
    {
        "id": "hin_2",
        "title": "Tum Hi Ho",
        "artist": "Arijit Singh, Mithoon",
        "query": "Tum Hi Ho Aashiqui 2 mp3",
        "language": "Hindi",
        "genre": "Soulful",
        "album": "Aashiqui 2",
        "coverUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
        "lyrics": "[00:02.00] Hum tere bin ab reh nahi sakte...\n[00:12.00] Tere bina kya wajood mera...\n[00:22.00] Kyun ki tum hi ho..."
    },
    {
        "id": "hin_3",
        "title": "Chaleya",
        "artist": "Arijit Singh, Shilpa Rao",
        "query": "Chaleya Jawan Arijit Singh mp3",
        "language": "Hindi",
        "genre": "Pop Dance",
        "album": "Jawan",
        "coverUrl": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
        "lyrics": "[00:03.00] Ishq mein dil bana hai chaleya...\n[00:12.00] Teri raahon mein, teri baahon mein..."
    },
    {
        "id": "mar_1",
        "title": "Zingaat",
        "artist": "Ajay-Atul",
        "query": "Zingaat Sairat Ajay Atul mp3",
        "language": "Marathi",
        "genre": "Folk Dance",
        "album": "Sairat",
        "coverUrl": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
        "lyrics": "[00:02.00] Usatun nighamala navin chhanda...\n[00:10.00] Zing zing zingaat! Zing zing zingaat!"
    },
    {
        "id": "mar_2",
        "title": "Apsara Aali",
        "artist": "Ajay-Atul, Shreya Ghoshal",
        "query": "Apsara Aali Natarang mp3",
        "language": "Marathi",
        "genre": "Lavani Classical",
        "album": "Natarang",
        "coverUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
        "lyrics": "[00:03.00] Aali thumkat naarat aali...\n[00:12.00] Apsara aali indrapuritun..."
    },
    {
        "id": "eng_1",
        "title": "Blinding Lights",
        "artist": "The Weeknd",
        "query": "Blinding Lights The Weeknd mp3",
        "language": "English",
        "genre": "Synthpop",
        "album": "After Hours",
        "coverUrl": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
        "lyrics": "[00:02.00] I've been tryna call...\n[00:16.00] I said, ooh, I'm blinded by the lights..."
    },
    {
        "id": "eng_2",
        "title": "Shape of You",
        "artist": "Ed Sheeran",
        "query": "Shape of You Ed Sheeran mp3",
        "language": "English",
        "genre": "Pop",
        "album": "Divide",
        "coverUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
        "lyrics": "[00:02.00] The club isn't the best place to find a lover...\n[00:18.00] I'm in love with the shape of you..."
    }
]

def search_and_download_archive():
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    print("[Archive Search] Querying Internet Archive for real MP3 song files...")

    for song in TARGET_SONGS:
        q = urllib.parse.quote(song["query"])
        url = f"https://archive.org/advancedsearch.php?q={q}&fl[]=identifier,title&sort[]=&rows=5&page=1&output=json"
        
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                docs = data.get('response', {}).get('docs', [])
                
                downloaded = False
                for doc in docs:
                    item_id = doc.get('identifier')
                    if not item_id: continue
                    
                    files_url = f"https://archive.org/metadata/{item_id}/files"
                    try:
                        req_files = urllib.request.Request(files_url, headers=headers)
                        with urllib.request.urlopen(req_files) as f_resp:
                            files_data = json.loads(f_resp.read().decode('utf-8'))
                            file_list = files_data.get('result', [])
                            
                            for f in file_list:
                                fname = f.get('name', '')
                                if fname.lower().endswith('.mp3'):
                                    download_url = f"https://archive.org/download/{item_id}/{urllib.parse.quote(fname)}"
                                    print(f"  Found real MP3 for '{song['title']}': {download_url}")
                                    
                                    target_path = os.path.join(SONGS_DIR, f"{song['id']}.mp3")
                                    dl_req = urllib.request.Request(download_url, headers=headers)
                                    with urllib.request.urlopen(dl_req) as dl_resp, open(target_path, 'wb') as out_f:
                                        out_f.write(dl_resp.read())
                                    
                                    print(f"  [SUCCESS] Downloaded real MP3 for '{song['title']}'!")
                                    downloaded = True
                                    break
                    except Exception as e:
                        continue
                    if downloaded: break
        except Exception as e:
            print(f"Error searching for {song['title']}: {e}")

if __name__ == '__main__':
    search_and_download_archive()
