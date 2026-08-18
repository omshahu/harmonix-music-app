import os
import math
import wave
import struct
import random
from database import read_db, write_db

STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static')
SONGS_DIR = os.path.join(STATIC_DIR, 'songs')
os.makedirs(SONGS_DIR, exist_ok=True)

def generate_track_audio(filepath, duration_sec, scale_freqs, bpm, style):
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
            sub_beat = (t % beat_duration) / beat_duration

            lead_freq = scale_freqs[current_beat % len(scale_freqs)]
            bass_freq = lead_freq / 2.0
            harmony_freq = lead_freq * 1.5

            if style == "acoustic": # Guitar / Flute
                lead_wave = (math.sin(2 * math.pi * lead_freq * t) * math.exp(-4.0 * sub_beat)) + 0.3 * math.sin(2 * math.pi * lead_freq * 2 * t)
                bass_wave = math.sin(2 * math.pi * bass_freq * t) * 0.4
                harmony_wave = math.sin(2 * math.pi * harmony_freq * t) * 0.2
                kick = math.exp(-10.0 * sub_beat) if (current_beat % 2 == 0) else 0.0
                snare = 0.0
            elif style == "piano": # Grand Piano
                lead_wave = (math.sin(2 * math.pi * lead_freq * t) + 0.5 * math.sin(2 * math.pi * lead_freq * 2 * t)) * math.exp(-3.0 * sub_beat)
                bass_wave = (math.sin(2 * math.pi * bass_freq * t) + 0.4 * math.sin(2 * math.pi * bass_freq * 2 * t)) * 0.5
                harmony_wave = math.sin(2 * math.pi * harmony_freq * t) * 0.3
                kick = math.exp(-8.0 * sub_beat) if (current_beat % 4 == 0) else 0.0
                snare = 0.0
            elif style == "dhol": # Zingaat / Lavani Percussion
                lead_wave = math.sin(2 * math.pi * lead_freq * t) * 0.3
                bass_wave = math.sin(2 * math.pi * bass_freq * t) * 0.5
                harmony_wave = math.sin(2 * math.pi * harmony_freq * t) * 0.2
                # High energy Dhol Tasha beat
                kick = math.exp(-15.0 * sub_beat) * 0.8
                snare = (random.random() * 2.0 - 1.0) * math.exp(-20.0 * sub_beat) * 0.6
            elif style == "synthpop": # 80s Retro / Synth
                lead_wave = math.copysign(1.0, math.sin(2 * math.pi * lead_freq * t)) * 0.3 # Square wave
                bass_wave = math.copysign(1.0, math.sin(2 * math.pi * bass_freq * t)) * 0.4
                harmony_wave = math.sin(2 * math.pi * harmony_freq * t) * 0.2
                kick = math.exp(-16.0 * sub_beat) * 0.7
                snare = (random.random() * 2.0 - 1.0) * math.exp(-12.0 * sub_beat) if (current_beat % 2 == 1) else 0.0
            elif style == "marimba": # Shape of You / Pop
                lead_wave = math.sin(2 * math.pi * lead_freq * t) * math.exp(-12.0 * sub_beat)
                bass_wave = math.sin(2 * math.pi * bass_freq * t) * 0.4
                harmony_wave = math.sin(2 * math.pi * harmony_freq * t) * 0.25
                kick = math.exp(-14.0 * sub_beat) if (current_beat % 2 == 0) else 0.0
                snare = (random.random() * 2.0 - 1.0) * math.exp(-18.0 * sub_beat) if (current_beat % 2 == 1) else 0.0
            else: # General Pop
                lead_wave = math.sin(2 * math.pi * lead_freq * t) * 0.4
                bass_wave = math.sin(2 * math.pi * bass_freq * t) * 0.4
                harmony_wave = math.sin(2 * math.pi * harmony_freq * t) * 0.2
                kick = math.exp(-12.0 * sub_beat) if (current_beat % 2 == 0) else 0.0
                snare = (random.random() * 2.0 - 1.0) * math.exp(-15.0 * sub_beat) if (current_beat % 2 == 1) else 0.0

            sample = (lead_wave * 0.35 + bass_wave * 0.35 + harmony_wave * 0.2 + kick * 0.3 + snare * 0.2)
            
            # Fade in/out
            if t < 0.5:
                sample *= (t / 0.5)
            elif t > duration_sec - 1.0:
                sample *= max(0.0, (duration_sec - t))

            int_sample = int(max(-1.0, min(1.0, sample * 0.6)) * 32767)
            frames.extend(struct.pack('<h', int_sample))

        wav_file.writeframes(frames)

def build_real_music_library():
    print("[Music Builder] Generating 15 distinct, rich musical tracks across Hindi, Marathi, and English...")

    tracks = [
        # Hindi
        { "id": "hin_1", "title": "Kesariya", "artist": "Arijit Singh, Pritam", "artistId": "art_arijit", "album": "Brahmastra", "albumId": "alb_brahmastra", "language": "Hindi", "genre": "Romantic", "duration": 45, "scale": [261.63, 293.66, 329.63, 349.23, 392.00], "bpm": 98, "style": "acoustic", "coverUrl": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80", "lyrics": "[00:02.00] Mujhko kitna pyaar hai tumse...\n[00:10.00] Kesariya tera ishq hai piya...\n[00:20.00] Rang jaaun jo main haath lagaun..." },
        { "id": "hin_2", "title": "Tum Hi Ho", "artist": "Arijit Singh, Mithoon", "artistId": "art_arijit", "album": "Aashiqui 2", "albumId": "alb_aashiqui2", "language": "Hindi", "genre": "Soulful", "duration": 48, "scale": [220.00, 246.94, 261.63, 293.66, 329.63], "bpm": 84, "style": "piano", "coverUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80", "lyrics": "[00:02.00] Hum tere bin ab reh nahi sakte...\n[00:12.00] Tere bina kya wajood mera...\n[00:22.00] Kyun ki tum hi ho, ab tum hi ho..." },
        { "id": "hin_3", "title": "Chaleya", "artist": "Arijit Singh, Shilpa Rao", "artistId": "art_arijit", "album": "Jawan", "albumId": "alb_jawan", "language": "Hindi", "genre": "Pop Dance", "duration": 42, "scale": [293.66, 329.63, 369.99, 392.00, 440.00], "bpm": 120, "style": "synthpop", "coverUrl": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80", "lyrics": "[00:03.00] Ishq mein dil bana hai chaleya...\n[00:12.00] Teri raahon mein, teri baahon mein..." },
        { "id": "hin_4", "title": "Raataan Lambiyan", "artist": "Jubin Nautiyal, Asees Kaur", "artistId": "art_jubin", "album": "Shershaah", "albumId": "alb_shershaah", "language": "Hindi", "genre": "Romantic", "duration": 46, "scale": [261.63, 293.66, 329.63, 392.00, 440.00], "bpm": 95, "style": "acoustic", "coverUrl": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80", "lyrics": "[00:04.00] Teri meri gallan ho gayi mashhoor...\n[00:14.00] Kar na kabhi tu mujhe nazron se door..." },
        { "id": "hin_5", "title": "Pasoori", "artist": "Ali Sethi, Shae Gill", "artistId": "art_alisethi", "album": "Coke Studio 14", "albumId": "alb_cokestudio", "language": "Hindi", "genre": "Folk Pop", "duration": 44, "scale": [196.00, 220.00, 246.94, 261.63, 293.66], "bpm": 115, "style": "marimba", "coverUrl": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80", "lyrics": "[00:02.00] Agg laavan majboori nu...\n[00:10.00] Aan jaan di pasoori nu..." },

        # Marathi
        { "id": "mar_1", "title": "Zingaat", "artist": "Ajay-Atul", "artistId": "art_ajayatul", "album": "Sairat", "albumId": "alb_sairat", "language": "Marathi", "genre": "Folk Dance", "duration": 45, "scale": [329.63, 369.99, 392.00, 440.00, 493.88], "bpm": 138, "style": "dhol", "coverUrl": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80", "lyrics": "[00:02.00] Usatun nighamala navin chhanda...\n[00:10.00] Zing zing zingaat! Zing zing zingaat!" },
        { "id": "mar_2", "title": "Apsara Aali", "artist": "Ajay-Atul, Shreya Ghoshal", "artistId": "art_ajayatul", "album": "Natarang", "albumId": "alb_natarang", "language": "Marathi", "genre": "Lavani Classical", "duration": 46, "scale": [293.66, 329.63, 349.23, 392.00, 440.00], "bpm": 105, "style": "dhol", "coverUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80", "lyrics": "[00:03.00] Aali thumkat naarat aali...\n[00:12.00] Apsara aali indrapuritun..." },
        { "id": "mar_3", "title": "Yad Lagla", "artist": "Ajay-Atul", "artistId": "art_ajayatul", "album": "Sairat", "albumId": "alb_sairat", "language": "Marathi", "genre": "Romantic Orchestral", "duration": 44, "scale": [220.00, 261.63, 293.66, 329.63, 392.00], "bpm": 88, "style": "piano", "coverUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80", "lyrics": "[00:03.00] Yad lagla re, yad lagla...\n[00:14.00] Jiwagaala mazya tuza yad lagla..." },
        { "id": "mar_4", "title": "Chandra", "artist": "Shreya Ghoshal, Ajay-Atul", "artistId": "art_shreya", "album": "Chandramukhi", "albumId": "alb_chandramukhi", "language": "Marathi", "genre": "Lavani Dance", "duration": 45, "scale": [349.23, 392.00, 440.00, 493.88, 523.25], "bpm": 124, "style": "dhol", "coverUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80", "lyrics": "[00:02.00] Chandra ugalela gaganat...\n[00:10.00] Shingaar kelaya me chandramukhi..." },
        { "id": "mar_5", "title": "Khel Mandala", "artist": "Ajay-Atul", "artistId": "art_ajayatul", "album": "Natarang", "albumId": "alb_natarang", "language": "Marathi", "genre": "Emotional Folk", "duration": 48, "scale": [196.00, 220.00, 246.94, 293.66, 329.63], "bpm": 80, "style": "acoustic", "coverUrl": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80", "lyrics": "[00:04.00] Khel mandala, khel mandala...\n[00:15.00] Niyati cha ha khel mandala..." },

        # English
        { "id": "eng_1", "title": "Blinding Lights", "artist": "The Weeknd", "artistId": "art_weeknd", "album": "After Hours", "albumId": "alb_afterhours", "language": "English", "genre": "Synthpop", "duration": 42, "scale": [349.23, 392.00, 440.00, 523.25, 587.33], "bpm": 171, "style": "synthpop", "coverUrl": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80", "lyrics": "[00:02.00] I've been tryna call...\n[00:16.00] I said, ooh, I'm blinded by the lights..." },
        { "id": "eng_2", "title": "Shape of You", "artist": "Ed Sheeran", "artistId": "art_edsheeran", "album": "Divide", "albumId": "alb_divide", "language": "English", "genre": "Pop", "duration": 45, "scale": [293.66, 329.63, 369.99, 440.00, 493.88], "bpm": 96, "style": "marimba", "coverUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80", "lyrics": "[00:02.00] The club isn't the best place to find a lover...\n[00:18.00] I'm in love with the shape of you..." },
        { "id": "eng_3", "title": "Levitating", "artist": "Dua Lipa", "artistId": "art_dualipa", "album": "Future Nostalgia", "albumId": "alb_futurenostalgia", "language": "English", "genre": "Disco Pop", "duration": 44, "scale": [329.63, 369.99, 392.00, 440.00, 493.88], "bpm": 103, "style": "synthpop", "coverUrl": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80", "lyrics": "[00:03.00] If you wanna run away with me...\n[00:22.00] My sugarboo, I'm levitating..." },
        { "id": "eng_4", "title": "Starboy", "artist": "The Weeknd ft. Daft Punk", "artistId": "art_weeknd", "album": "Starboy", "albumId": "alb_starboy", "language": "English", "genre": "Electronic", "duration": 42, "scale": [220.00, 261.63, 293.66, 329.63, 349.23], "bpm": 120, "style": "synthpop", "coverUrl": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80", "lyrics": "[00:02.00] I'm tryna put you in the worst mood...\n[00:20.00] Look what you've done, I'm a starboy..." },
        { "id": "eng_5", "title": "As It Was", "artist": "Harry Styles", "artistId": "art_harry", "album": "Harry's House", "albumId": "alb_harryshouse", "language": "English", "genre": "Indie Pop", "duration": 40, "scale": [293.66, 329.63, 392.00, 440.00, 493.88], "bpm": 174, "style": "marimba", "coverUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80", "lyrics": "[00:02.00] Come on, Harry, we wanna say goodnight to you...\n[00:20.00] You know it's not the same as it was..." }
    ]

    songs_data = []

    for t in tracks:
        wav_filename = f"{t['id']}.wav"
        wav_filepath = os.path.join(SONGS_DIR, wav_filename)
        generate_track_audio(wav_filepath, t['duration'], t['scale'], t['bpm'], t['style'])
        print(f"  - Generated distinct [{t['language']} - {t['style']}]: {t['title']} by {t['artist']}")

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
            "plays": random.randint(200000, 950000),
            "likes": random.randint(15000, 80000)
        })

    db = read_db()
    db["songs"] = songs_data
    write_db(db)
    print("[OK] Rich music library built successfully with distinct audio for each track!")

if __name__ == '__main__':
    build_real_music_library()
