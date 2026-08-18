import yt_dlp
import os

STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static')
SONGS_DIR = os.path.join(STATIC_DIR, 'songs')
os.makedirs(SONGS_DIR, exist_ok=True)

def get_yt_audio_url_or_file(yt_id):
    url = f"https://www.youtube.com/watch?v={yt_id}"
    
    # Method 1: Get direct audio stream URL (instant 0 sec delay)
    ydl_opts_fast = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',
        'quiet': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts_fast) as ydl:
        info = ydl.extract_info(url, download=False)
        stream_url = info.get('url')
        print(f"Direct Audio Stream URL: {stream_url[:100]}...")
        return stream_url

if __name__ == '__main__':
    print("Testing direct audio stream extraction for video 'BddP6PYo2gs' (Kesariya)...")
    get_yt_audio_url_or_file('BddP6PYo2gs')
