import yt_dlp
import json

def test_yt_search(query):
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'extract_flat': True,
        'nobytes': True,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f"ytsearch5:{query}", download=False)
        results = []
        if 'entries' in info:
            for entry in info['entries']:
                results.append({
                    'id': f"yt_{entry['id']}",
                    'ytId': entry['id'],
                    'title': entry.get('title'),
                    'artist': entry.get('uploader') or entry.get('channel') or 'Artist',
                    'duration': entry.get('duration') or 180,
                    'coverUrl': f"https://i.ytimg.com/vi/{entry['id']}/hqdefault.jpg",
                    'language': 'Hindi' if 'hindi' in query.lower() else ('Marathi' if 'marathi' in query.lower() else 'Music')
                })
        return results

if __name__ == '__main__':
    print("Testing YouTube Search for 'Kesariya Arijit Singh'...")
    res = test_yt_search("Kesariya Arijit Singh")
    print(json.dumps(res, indent=2))
