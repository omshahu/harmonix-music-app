const fs = require('fs');
const path = require('path');
const { writeDB } = require('./db');

const SONGS_DIR = path.join(__dirname, 'public', 'songs');
const ARTWORK_DIR = path.join(__dirname, 'public', 'artwork');

if (!fs.existsSync(SONGS_DIR)) fs.mkdirSync(SONGS_DIR, { recursive: true });
if (!fs.existsSync(ARTWORK_DIR)) fs.mkdirSync(ARTWORK_DIR, { recursive: true });

// Function to generate a valid PCM WAV audio buffer with melodious harmonic frequencies
function generateSynthesizedWav(durationSeconds, baseFreqs, bpm = 100) {
  const sampleRate = 22050; // 22.05kHz mono audio for lightweight size & fast loading
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * 2; // 16-bit PCM (2 bytes per sample)
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22);  // NumChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32);  // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate pleasant harmonic synth note sequence
  const beatDuration = 60 / bpm;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const currentBeat = Math.floor(t / beatDuration);
    const freq = baseFreqs[currentBeat % baseFreqs.length];
    
    // Main melody wave + octave bass + warm harmonic overdrive
    const mainSine = Math.sin(2 * Math.PI * freq * t);
    const bassSine = Math.sin(2 * Math.PI * (freq / 2) * t) * 0.5;
    const harmonicSine = Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.25;
    
    // Envelope per beat
    const beatPhase = (t % beatDuration) / beatDuration;
    const env = Math.exp(-3 * beatPhase);

    // Combine & scale to 16-bit signed integer (-32768 to 32767)
    let sample = (mainSine + bassSine + harmonicSine) * env * 0.4;
    // Fade out near end of track
    if (t > durationSeconds - 2) {
      sample *= Math.max(0, (durationSeconds - t) / 2);
    }

    const intSample = Math.floor(Math.max(-1, Math.min(1, sample)) * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

function seed() {
  console.log('🎵 Generating royalty-free synthesized seed tracks...');

  const trackDefs = [
    {
      id: 'song_1',
      title: 'Midnight Cyberpunk',
      artist: 'Aethelgard',
      artistId: 'artist_1',
      album: 'Neon Horizon',
      albumId: 'album_1',
      genre: 'Synthwave',
      duration: 45,
      freqs: [220, 261.63, 329.63, 392.00, 220, 293.66, 349.23, 440], // Am - F - C - G
      coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
      lyrics: `[00:02.00] Cruising down the neon boulevard...
[00:08.00] Electric lights fade into darkness.
[00:15.00] Harmonix echoes in the digital sky.
[00:24.00] No ads, no limits, just pure rhythm.
[00:33.00] Lost in the synthwave frequency...`,
      bpm: 110
    },
    {
      id: 'song_2',
      title: 'Starlight Lo-Fi Chill',
      artist: 'Luna Drift',
      artistId: 'artist_2',
      album: 'Cosmic Coffee',
      albumId: 'album_2',
      genre: 'Lo-Fi',
      duration: 50,
      freqs: [174.61, 220.00, 261.63, 329.63, 196.00, 246.94, 293.66, 392.00], // Fmaj7 - G6
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
      lyrics: `[00:03.00] Warm coffee on a rainy night...
[00:10.00] Raindrops tapping gently on the window glass.
[00:20.00] Vinyl warmth spinning in slow motion.
[00:32.00] Relax, exhale, feel the groove.`,
      bpm: 85
    },
    {
      id: 'song_3',
      title: 'Velvet Acoustic Rain',
      artist: 'Julian Vance',
      artistId: 'artist_3',
      album: 'Whispering Pines',
      albumId: 'album_3',
      genre: 'Acoustic',
      duration: 40,
      freqs: [146.83, 220.00, 293.66, 369.99, 164.81, 246.94, 329.63, 440], // D - E
      coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80',
      lyrics: `[00:02.00] Six strings strumming softly in the evening sun.
[00:12.00] Mountain breezes carry memories away.
[00:22.00] Simple melodies that feel like home.
[00:30.00] Peace in every note...`,
      bpm: 92
    },
    {
      id: 'song_4',
      title: 'Quantum Horizon Drift',
      artist: 'Aethelgard',
      artistId: 'artist_1',
      album: 'Neon Horizon',
      albumId: 'album_1',
      genre: 'Ambient',
      duration: 48,
      freqs: [130.81, 164.81, 196.00, 246.94, 146.83, 174.61, 220.00, 261.63],
      coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      lyrics: `[00:04.00] Floating beyond the stratosphere...
[00:16.00] Weightless thoughts merging with sound.
[00:28.00] Infinite pulse of the universe.
[00:38.00] Uninterrupted harmony forever.`,
      bpm: 75
    },
    {
      id: 'song_5',
      title: 'Solar Pulse Electronic',
      artist: 'Vortex 9',
      artistId: 'artist_4',
      album: 'Supernova',
      albumId: 'album_4',
      genre: 'Electronic',
      duration: 42,
      freqs: [130.81, 155.56, 196.00, 233.08, 146.83, 174.61, 220.00, 261.63],
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
      lyrics: `[00:02.00] Feel the bass resonance in your chest!
[00:10.00] Turn the volume up, lose control!
[00:20.00] Energy surges through every circuit!
[00:30.00] High performance, 100% ad-free stream!`,
      bpm: 128
    }
  ];

  const songs = trackDefs.map(t => {
    const fileName = `${t.id}.wav`;
    const filePath = path.join(SONGS_DIR, fileName);
    const audioBuffer = generateSynthesizedWav(t.duration, t.freqs, t.bpm);
    fs.writeFileSync(filePath, audioBuffer);
    console.log(`  ✓ Generated audio file: ${fileName} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);

    return {
      id: t.id,
      title: t.title,
      artist: t.artist,
      artistId: t.artistId,
      album: t.album,
      albumId: t.albumId,
      genre: t.genre,
      duration: t.duration,
      audioUrl: `/api/songs/stream/${t.id}`,
      coverUrl: t.coverUrl,
      lyrics: t.lyrics,
      plays: Math.floor(Math.random() * 50000) + 1200,
      likes: Math.floor(Math.random() * 4000) + 300,
      createdAt: new Date().toISOString()
    };
  });

  const artists = [
    {
      id: 'artist_1',
      name: 'Aethelgard',
      bio: 'Pioneer of dark synthwave and cyberpunk soundscapes. Crafting futuristic audio journeys since 2021.',
      image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
      monthlyListeners: 145020,
      verified: true
    },
    {
      id: 'artist_2',
      name: 'Luna Drift',
      bio: 'Lo-fi chill producer blending vinyl crackles, warm Fender Rhodes keys, and relaxing rainfall atmosphere.',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      monthlyListeners: 89300,
      verified: true
    },
    {
      id: 'artist_3',
      name: 'Julian Vance',
      bio: 'Indie acoustic singer-songwriter crafting intimate organic melodies inspired by pine forests.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      monthlyListeners: 62100,
      verified: true
    },
    {
      id: 'artist_4',
      name: 'Vortex 9',
      bio: 'High energy electronic festival DJ pushing the boundaries of sub-bass and solar synth leads.',
      image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
      monthlyListeners: 210400,
      verified: true
    }
  ];

  const albums = [
    {
      id: 'album_1',
      title: 'Neon Horizon',
      artist: 'Aethelgard',
      artistId: 'artist_1',
      coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
      year: 2025,
      genre: 'Synthwave'
    },
    {
      id: 'album_2',
      title: 'Cosmic Coffee',
      artist: 'Luna Drift',
      artistId: 'artist_2',
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
      year: 2024,
      genre: 'Lo-Fi'
    },
    {
      id: 'album_3',
      title: 'Whispering Pines',
      artist: 'Julian Vance',
      artistId: 'artist_3',
      coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80',
      year: 2024,
      genre: 'Acoustic'
    },
    {
      id: 'album_4',
      title: 'Supernova',
      artist: 'Vortex 9',
      artistId: 'artist_4',
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
      year: 2026,
      genre: 'Electronic'
    }
  ];

  const playlists = [
    {
      id: 'playlist_liked',
      userId: 'user_demo',
      name: 'Liked Songs',
      description: 'Your collection of favorite ad-free tracks',
      coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
      isLikedSongs: true,
      songIds: ['song_1', 'song_2', 'song_5'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'playlist_1',
      userId: 'user_demo',
      name: 'Late Night Coding',
      description: 'Focused lo-fi and synthwave rhythms without ads',
      coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      isLikedSongs: false,
      songIds: ['song_1', 'song_2', 'song_4'],
      createdAt: new Date().toISOString()
    }
  ];

  const folders = [
    {
      id: 'folder_1',
      userId: 'user_demo',
      name: 'Chill Vibes & Study',
      playlistIds: ['playlist_liked', 'playlist_1'],
      songIds: ['song_2', 'song_3'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'folder_2',
      userId: 'user_demo',
      name: 'High Energy & Gym',
      playlistIds: [],
      songIds: ['song_1', 'song_5'],
      createdAt: new Date().toISOString()
    }
  ];

  const users = [
    {
      id: 'user_demo',
      username: 'Alex Harmony',
      email: 'alex@harmonix.com',
      password: '$2a$10$e846ZtM8C9L.W0XQ3Y0K.e9f7g8h9i0j1k2l3m4n5o6p7q8r9s',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      createdAt: new Date().toISOString()
    }
  ];

  const dbData = {
    users,
    songs,
    artists,
    albums,
    playlists,
    folders,
    downloads: []
  };

  writeDB(dbData);
  console.log('✅ Database seeded successfully with songs, artists, albums, playlists, and folders!');
}

seed();
