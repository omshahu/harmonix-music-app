import os
import math
import wave
import struct
import random
from datetime import datetime
from database import read_db, write_db

STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static')
SONGS_DIR = os.path.join(STATIC_DIR, 'songs')
ARTWORK_DIR = os.path.join(STATIC_DIR, 'artwork')

os.makedirs(SONGS_DIR, exist_ok=True)
os.makedirs(ARTWORK_DIR, exist_ok=True)

# Generate a rich multi-layered instrumental arrangement for realistic music audio
function_wav_gen = True

def generate_melodic_wav(filepath, duration_sec, scale_freqs, bpm=110, style="bollywood"):
    sample_rate = 22050
    num_samples = int(sample_rate * duration_sec)
    beat_duration = 60.0 / bpm

    with wave.open(filepath, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        frames = bytearray()
        for i in range(num_samples):
            t = i / sample_rate
            current_beat = int(t / beat_duration)
            
            # Lead Melody Frequency
            lead_freq = scale_freqs[current_beat % len(scale_freqs)]
            # Bass Frequency (1 or 2 octaves below)
            bass_freq = lead_freq / 2.0
            # Harmony Frequency (3rd / 5th above)
            harmony_freq = lead_freq * 1.5

            # Lead Synth / Instrument wave
            lead_wave = math.sin(2 * math.pi * lead_freq * t) + 0.3 * math.sin(2 * math.pi * lead_freq * 2 * t)
            # Bass wave
            bass_wave = math.sin(2 * math.pi * bass_freq * t) * 0.6
            # Harmony pad
            harmony_wave = math.sin(2 * math.pi * harmony_freq * t) * 0.25
            
            # Rhythm Percussion / Kick beat pulse simulation
            beat_phase = (t % beat_duration) / beat_duration
            kick = math.exp(-12.0 * beat_phase) if (current_beat % 2 == 0) else 0.0
            snare = (random.random() * 2.0 - 1.0) * math.exp(-15.0 * beat_phase) if (current_beat % 2 == 1) else 0.0

            # Combined Mix
            sample = (lead_wave * 0.3 + bass_wave * 0.35 + harmony_wave * 0.2 + kick * 0.25 + snare * 0.15)
            
            # Beat Envelope
            env = 0.8 + 0.2 * math.sin(2 * math.pi * (t / beat_duration))
            sample *= env

            # Fade in & Fade out
            if t < 1.0:
                sample *= t
            elif t > duration_sec - 2.0:
                sample *= max(0.0, (duration_sec - t) / 2.0)

            int_sample = int(max(-1.0, min(1.0, sample * 0.5)) * 32767)
            frames.extend(struct.pack('<h', int_sample))

        wav_file.writeframes(frames)

def seed_audio_data():
    print("[Audio] Generating Hindi, Marathi, and English multi-language music tracks...")

    tracks = [
        # --- HINDI SONGS ---
        {
            "id": "hin_1",
            "title": "Kesariya",
            "artist": "Arijit Singh, Pritam",
            "artistId": "art_arijit",
            "album": "Brahmastra",
            "albumId": "alb_brahmastra",
            "language": "Hindi",
            "genre": "Romantic",
            "duration": 55,
            "scale": [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88], # C Major / Dholak groove
            "coverUrl": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
            "lyrics": "[00:02.00] Mujhko kitna pyaar hai tumse...\n[00:10.00] Kesariya tera ishq hai piya...\n[00:20.00] Rang jaaun jo main haath lagaun...\n[00:30.00] Din beete saare teri fikr mein...\n[00:42.00] Rain beete tere zikr mein...",
            "bpm": 98
        },
        {
            "id": "hin_2",
            "title": "Tum Hi Ho",
            "artist": "Arijit Singh, Mithoon",
            "artistId": "art_arijit",
            "album": "Aashiqui 2",
            "albumId": "alb_aashiqui2",
            "language": "Hindi",
            "genre": "Soulful",
            "duration": 50,
            "scale": [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00], # A Minor Piano
            "coverUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
            "lyrics": "[00:02.00] Hum tere bin ab reh nahi sakte...\n[00:12.00] Tere bina kya wajood mera...\n[00:22.00] Kyun ki tum hi ho, ab tum hi ho...\n[00:34.00] Zindagi ab tum hi ho...",
            "bpm": 84
        },
        {
            "id": "hin_3",
            "title": "Chaleya",
            "artist": "Arijit Singh, Shilpa Rao",
            "artistId": "art_arijit",
            "album": "Jawan",
            "albumId": "alb_jawan",
            "language": "Hindi",
            "genre": "Pop Dance",
            "duration": 48,
            "scale": [293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 554.37], # D Major Pop
            "coverUrl": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
            "lyrics": "[00:03.00] Ishq mein dil bana hai chaleya...\n[00:12.00] Teri raahon mein, teri baahon mein...\n[00:24.00] Tu hi mera sach hai, tu hi mera sapna...\n[00:36.00] Chaleya teri or...",
            "bpm": 120
        },
        {
            "id": "hin_4",
            "title": "Raataan Lambiyan",
            "artist": "Jubin Nautiyal, Asees Kaur",
            "artistId": "art_jubin",
            "album": "Shershaah",
            "albumId": "alb_shershaah",
            "language": "Hindi",
            "genre": "Romantic",
            "duration": 52,
            "scale": [261.63, 293.66, 329.63, 392.00, 440.00],
            "coverUrl": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
            "lyrics": "[00:04.00] Teri meri gallan ho gayi mashhoor...\n[00:14.00] Kar na kabhi tu mujhe nazron se door...\n[00:26.00] Raataan lambiyan lambiyan re...",
            "bpm": 95
        },
        {
            "id": "hin_5",
            "title": "Pasoori",
            "artist": "Ali Sethi, Shae Gill",
            "artistId": "art_alisethi",
            "album": "Coke Studio 14",
            "albumId": "alb_cokestudio",
            "language": "Hindi",
            "genre": "Folk Pop",
            "duration": 46,
            "scale": [196.00, 220.00, 246.94, 261.63, 293.66, 329.63],
            "coverUrl": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
            "lyrics": "[00:02.00] Agg laavan majboori nu...\n[00:10.00] Aan jaan di pasoori nu...\n[00:20.00] Zeher bane haan teri yaad da...",
            "bpm": 115
        },

        # --- MARATHI SONGS ---
        {
            "id": "mar_1",
            "title": "Zingaat",
            "artist": "Ajay-Atul",
            "artistId": "art_ajayatul",
            "album": "Sairat",
            "albumId": "alb_sairat",
            "language": "Marathi",
            "genre": "Folk Dance",
            "duration": 50,
            "scale": [329.63, 369.99, 392.00, 440.00, 493.88, 523.25], # High Dhol Tasha rhythm
            "coverUrl": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
            "lyrics": "[00:02.00] Usatun nighamala navin chhanda...\n[00:10.00] Haat dhartoy haatacha spardha...\n[00:18.00] Zing zing zingaat! Zing zing zingaat!\n[00:30.00] Naachayaala laglaaya gaav saara!",
            "bpm": 138
        },
        {
            "id": "mar_2",
            "title": "Apsara Aali",
            "artist": "Ajay-Atul, Shreya Ghoshal",
            "artistId": "art_ajayatul",
            "album": "Natarang",
            "albumId": "alb_natarang",
            "language": "Marathi",
            "genre": "Lavani Classical",
            "duration": 52,
            "scale": [293.66, 329.63, 349.23, 392.00, 440.00, 493.88], # Classical Raag Bhairavi blend
            "coverUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
            "lyrics": "[00:03.00] Aali thumkat naarat aali...\n[00:12.00] Apsara aali indrapuritun...\n[00:22.00] Chhhanana chhanana ghungroo vaajati...\n[00:34.00] Rupachi khaan hi lavanyachi rani...",
            "bpm": 105
        },
        {
            "id": "mar_3",
            "title": "Yad Lagla",
            "artist": "Ajay-Atul",
            "artistId": "art_ajayatul",
            "album": "Sairat",
            "albumId": "alb_sairat",
            "language": "Marathi",
            "genre": "Romantic Orchestral",
            "duration": 48,
            "scale": [220.00, 261.63, 293.66, 329.63, 392.00],
            "coverUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
            "lyrics": "[00:03.00] Yad lagla re, yad lagla...\n[00:14.00] Jiwagaala mazya tuza yad lagla...\n[00:26.00] Swapnat mazya tuzech rup aala...",
            "bpm": 88
        },
        {
            "id": "mar_4",
            "title": "Chandra",
            "artist": "Shreya Ghoshal, Ajay-Atul",
            "artistId": "art_shreya",
            "album": "Chandramukhi",
            "albumId": "alb_chandramukhi",
            "language": "Marathi",
            "genre": "Lavani Dance",
            "duration": 50,
            "scale": [349.23, 392.00, 440.00, 493.88, 523.25],
            "coverUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
            "lyrics": "[00:02.00] Chandra ugalela gaganat...\n[00:10.00] Shingaar kelaya me chandramukhi...\n[00:20.00] Tuzya sathi gaate me gani...",
            "bpm": 124
        },
        {
            "id": "mar_5",
            "title": "Khel Mandala",
            "artist": "Ajay-Atul",
            "artistId": "art_ajayatul",
            "album": "Natarang",
            "albumId": "alb_natarang",
            "language": "Marathi",
            "genre": "Emotional Folk",
            "duration": 54,
            "scale": [196.00, 220.00, 246.94, 293.66, 329.63],
            "coverUrl": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
            "lyrics": "[00:04.00] Khel mandala, khel mandala...\n[00:15.00] Niyati cha ha khel mandala...\n[00:28.00] Aayushyacha waatevar...",
            "bpm": 80
        },

        # --- ENGLISH SONGS ---
        {
            "id": "eng_1",
            "title": "Blinding Lights",
            "artist": "The Weeknd",
            "artistId": "art_weeknd",
            "album": "After Hours",
            "albumId": "alb_afterhours",
            "language": "English",
            "genre": "Synthpop",
            "duration": 45,
            "scale": [349.23, 392.00, 440.00, 523.25, 587.33], # Synthpop 80s drive
            "coverUrl": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
            "lyrics": "[00:02.00] I've been tryna call...\n[00:08.00] I've been on my own for long enough...\n[00:16.00] I said, ooh, I'm blinded by the lights...\n[00:26.00] No, I can't sleep until I feel your touch...",
            "bpm": 171
        },
        {
            "id": "eng_2",
            "title": "Shape of You",
            "artist": "Ed Sheeran",
            "artistId": "art_edsheeran",
            "album": "Divide",
            "albumId": "alb_divide",
            "language": "English",
            "genre": "Pop",
            "duration": 48,
            "scale": [293.66, 329.63, 369.99, 440.00, 493.88], # Marimba rhythm
            "coverUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
            "lyrics": "[00:02.00] The club isn't the best place to find a lover...\n[00:10.00] So the bar is where I go...\n[00:18.00] I'm in love with the shape of you...\n[00:28.00] We push and pull like a magnet do...",
            "bpm": 96
        },
        {
            "id": "eng_3",
            "title": "Levitating",
            "artist": "Dua Lipa",
            "artistId": "art_dualipa",
            "album": "Future Nostalgia",
            "albumId": "alb_futurenostalgia",
            "language": "English",
            "genre": "Disco Pop",
            "duration": 46,
            "scale": [329.63, 369.99, 392.00, 440.00, 493.88],
            "coverUrl": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
            "lyrics": "[00:03.00] If you wanna run away with me, I know a galaxy...\n[00:12.00] You want me, I want you, baby...\n[00:22.00] My sugarboo, I'm levitating...",
            "bpm": 103
        },
        {
            "id": "eng_4",
            "title": "Starboy",
            "artist": "The Weeknd ft. Daft Punk",
            "artistId": "art_weeknd",
            "album": "Starboy",
            "albumId": "alb_starboy",
            "language": "English",
            "genre": "Electronic",
            "duration": 44,
            "scale": [220.00, 261.63, 293.66, 329.63, 349.23],
            "coverUrl": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
            "lyrics": "[00:02.00] I'm tryna put you in the worst mood, ah...\n[00:10.00] P1 cleaner than your church shoes, ah...\n[00:20.00] Look what you've done, I'm a motherf***ing starboy...",
            "bpm": 120
        },
        {
            "id": "eng_5",
            "title": "As It Was",
            "artist": "Harry Styles",
            "artistId": "art_harry",
            "album": "Harry's House",
            "albumId": "alb_harryshouse",
            "language": "English",
            "genre": "Indie Pop",
            "duration": 42,
            "scale": [293.66, 329.63, 392.00, 440.00, 493.88],
            "coverUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
            "lyrics": "[00:02.00] Come on, Harry, we wanna say goodnight to you...\n[00:10.00] Holdin' me back, gravity's holdin' me back...\n[00:20.00] You know it's not the same as it was...",
            "bpm": 174
        }
    ]

    songs_data = []
    for t in tracks:
        filename = f"{t['id']}.wav"
        filepath = os.path.join(SONGS_DIR, filename)
        generate_melodic_wav(filepath, t['duration'], t['scale'], t['bpm'], t['genre'])
        print(f"  - Generated [{t['language']}]: {t['title']} by {t['artist']}")

        songs_data.append({
            "id": t["id"],
            "title": t["title"],
            "artist": t["artist"],
            "artistId": t["artistId"],
            "album": t["album"],
            "albumId": t["albumId"],
            "language": t["language"],
            "genre": t["genre"],
            "duration": t["duration"],
            "audioUrl": f"/api/songs/stream/{t['id']}",
            "coverUrl": t["coverUrl"],
            "lyrics": t["lyrics"],
            "plays": random.randint(15000, 850000),
            "likes": random.randint(1200, 95000),
            "createdAt": datetime.now().isoformat()
        })

    artists_data = [
        {
            "id": "art_arijit",
            "name": "Arijit Singh",
            "bio": "King of Bollywood soulful romantic playback singing.",
            "image": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80",
            "monthlyListeners": 38400000,
            "verified": True
        },
        {
            "id": "art_ajayatul",
            "name": "Ajay-Atul",
            "bio": "Legendary Marathi & Hindi music composer duo behind Sairat and Natarang.",
            "image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
            "monthlyListeners": 12500000,
            "verified": True
        },
        {
            "id": "art_shreya",
            "name": "Shreya Ghoshal",
            "bio": "Iconic Indian playback singer across Marathi, Hindi, Tamil & Bengali.",
            "image": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
            "monthlyListeners": 29800000,
            "verified": True
        },
        {
            "id": "art_weeknd",
            "name": "The Weeknd",
            "bio": "Global pop superstar known for After Hours and Blinding Lights.",
            "image": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
            "monthlyListeners": 105000000,
            "verified": True
        },
        {
            "id": "art_edsheeran",
            "name": "Ed Sheeran",
            "bio": "British acoustic pop singer-songwriter and record-breaking artist.",
            "image": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
            "monthlyListeners": 82000000,
            "verified": True
        }
    ]

    albums_data = [
        {
            "id": "alb_brahmastra",
            "title": "Brahmastra",
            "artist": "Arijit Singh, Pritam",
            "artistId": "art_arijit",
            "coverUrl": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
            "year": 2022,
            "genre": "Bollywood Romantic"
        },
        {
            "id": "alb_sairat",
            "title": "Sairat",
            "artist": "Ajay-Atul",
            "artistId": "art_ajayatul",
            "coverUrl": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
            "year": 2016,
            "genre": "Marathi Folk & Romance"
        },
        {
            "id": "alb_afterhours",
            "title": "After Hours",
            "artist": "The Weeknd",
            "artistId": "art_weeknd",
            "coverUrl": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
            "year": 2020,
            "genre": "Synthpop"
        }
    ]

    db = read_db()
    db["songs"] = songs_data
    db["artists"] = artists_data
    db["albums"] = albums_data
    write_db(db)
    print("[OK] Multi-language database successfully seeded with Hindi, Marathi, and English tracks!")

if __name__ == '__main__':
    seed_audio_data()
