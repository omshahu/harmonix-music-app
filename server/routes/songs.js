const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { readDB, writeDB } = require('../db');

// Multer storage configuration for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      const dir = path.join(__dirname, '..', 'public', 'songs');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } else {
      const dir = path.join(__dirname, '..', 'public', 'artwork');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}_${Date.now()}_${Math.round(Math.random() * 1e5)}${ext}`);
  }
});

const upload = multer({ storage });

// GET all songs (with filtering & search)
router.get('/', (req, res) => {
  try {
    const db = readDB();
    let songs = db.songs || [];
    const { search, genre, artistId, albumId } = req.query;

    if (search) {
      const q = search.toLowerCase();
      songs = songs.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q)
      );
    }

    if (genre) {
      songs = songs.filter(s => s.genre.toLowerCase() === genre.toLowerCase());
    }

    if (artistId) {
      songs = songs.filter(s => s.artistId === artistId);
    }

    if (albumId) {
      songs = songs.filter(s => s.albumId === albumId);
    }

    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single song details
router.get('/:id', (req, res) => {
  const db = readDB();
  const song = (db.songs || []).find(s => s.id === req.params.id);
  if (!song) return res.status(404).json({ error: 'Song not found' });
  res.json(song);
});

// GET audio stream with HTTP 206 Partial Content Range Headers
router.get('/stream/:id', (req, res) => {
  const db = readDB();
  const song = (db.songs || []).find(s => s.id === req.params.id);
  if (!song) return res.status(404).send('Song not found');

  let filePath = path.join(__dirname, '..', 'public', 'songs', `${req.params.id}.wav`);
  if (!fs.existsSync(filePath)) {
    // Check uploaded files
    filePath = path.join(__dirname, '..', 'public', 'songs', song.filename || `${req.params.id}.mp3`);
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Audio file missing');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': filePath.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': filePath.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Download audio file endpoint
router.get('/download/:id', (req, res) => {
  const db = readDB();
  const song = (db.songs || []).find(s => s.id === req.params.id);
  if (!song) return res.status(404).json({ error: 'Song not found' });

  let filePath = path.join(__dirname, '..', 'public', 'songs', `${req.params.id}.wav`);
  if (!fs.existsSync(filePath) && song.filename) {
    filePath = path.join(__dirname, '..', 'public', 'songs', song.filename);
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Audio file missing' });
  }

  const safeFilename = `${song.title} - ${song.artist}`.replace(/[^a-z0-9_-]/gi, '_') + (filePath.endsWith('.wav') ? '.wav' : '.mp3');

  // Record download in DB log
  db.downloads = db.downloads || [];
  db.downloads.push({
    songId: song.id,
    songTitle: song.title,
    downloadedAt: new Date().toISOString()
  });
  writeDB(db);

  res.download(filePath, safeFilename);
});

// Toggle Like Song endpoint
router.post('/like/:id', (req, res) => {
  try {
    const { userId = 'user_demo' } = req.body;
    const db = readDB();
    const song = (db.songs || []).find(s => s.id === req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    // Find user's Liked Songs playlist
    let likedPlaylist = db.playlists.find(p => p.userId === userId && p.isLikedSongs);
    if (!likedPlaylist) {
      likedPlaylist = {
        id: 'playlist_liked_' + userId,
        userId: userId,
        name: 'Liked Songs',
        description: 'Your collection of favorite ad-free tracks',
        coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
        isLikedSongs: true,
        songIds: [],
        createdAt: new Date().toISOString()
      };
      db.playlists.push(likedPlaylist);
    }

    const index = likedPlaylist.songIds.indexOf(song.id);
    let isLiked = false;
    if (index > -1) {
      likedPlaylist.songIds.splice(index, 1);
      song.likes = Math.max(0, (song.likes || 1) - 1);
    } else {
      likedPlaylist.songIds.push(song.id);
      song.likes = (song.likes || 0) + 1;
      isLiked = true;
    }

    writeDB(db);
    res.json({ songId: song.id, isLiked, likedSongIds: likedPlaylist.songIds, totalLikes: song.likes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST upload new track
router.post('/upload', upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), (req, res) => {
  try {
    const { title, artist, album, genre, lyrics } = req.body;
    if (!title || !artist || !req.files || !req.files.audio) {
      return res.status(400).json({ error: 'Title, artist, and audio file are required' });
    }

    const audioFile = req.files.audio[0];
    const coverFile = req.files.cover ? req.files.cover[0] : null;

    const db = readDB();
    const songId = 'song_' + Date.now();

    // Check if artist exists or create
    let artistObj = db.artists.find(a => a.name.toLowerCase() === artist.toLowerCase());
    if (!artistObj) {
      artistObj = {
        id: 'artist_' + Date.now(),
        name: artist,
        bio: `Independent artist ${artist} streaming on Harmonix.`,
        image: coverFile ? `/public/artwork/${coverFile.filename}` : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
        monthlyListeners: 1200,
        verified: false
      };
      db.artists.push(artistObj);
    }

    // Check album or create
    const albumName = album || 'Single';
    let albumObj = db.albums.find(a => a.title.toLowerCase() === albumName.toLowerCase() && a.artistId === artistObj.id);
    if (!albumObj) {
      albumObj = {
        id: 'album_' + Date.now(),
        title: albumName,
        artist: artist,
        artistId: artistObj.id,
        coverUrl: coverFile ? `/public/artwork/${coverFile.filename}` : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        year: new Date().getFullYear(),
        genre: genre || 'Pop'
      };
      db.albums.push(albumObj);
    }

    const newSong = {
      id: songId,
      title,
      artist,
      artistId: artistObj.id,
      album: albumName,
      albumId: albumObj.id,
      genre: genre || 'Pop',
      duration: 180, // Default duration estimation
      audioUrl: `/api/songs/stream/${songId}`,
      filename: audioFile.filename,
      coverUrl: coverFile ? `/public/artwork/${coverFile.filename}` : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
      lyrics: lyrics || `[00:05.00] ${title} by ${artist}\n[00:15.00] Streaming ad-free on Harmonix!`,
      plays: 0,
      likes: 0,
      createdAt: new Date().toISOString()
    };

    db.songs.push(newSong);
    writeDB(db);

    res.status(201).json(newSong);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
