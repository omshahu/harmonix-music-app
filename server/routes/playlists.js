const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../db');

// --- PLAYLIST ROUTES ---

// GET user playlists
router.get('/', (req, res) => {
  const userId = req.query.userId || 'user_demo';
  const db = readDB();
  const playlists = (db.playlists || []).filter(p => p.userId === userId);
  res.json(playlists);
});

// GET single playlist with populated song objects
router.get('/:id', (req, res) => {
  const db = readDB();
  const playlist = (db.playlists || []).find(p => p.id === req.params.id);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  const songs = (db.songs || []).filter(s => playlist.songIds.includes(s.id));
  res.json({ ...playlist, songs });
});

// POST create new playlist
router.post('/', (req, res) => {
  try {
    const { name, description, coverUrl, userId = 'user_demo' } = req.body;
    if (!name) return res.status(400).json({ error: 'Playlist name is required' });

    const db = readDB();
    const newPlaylist = {
      id: 'playlist_' + Date.now(),
      userId,
      name,
      description: description || 'Custom playlist created on Harmonix',
      coverUrl: coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
      isLikedSongs: false,
      songIds: [],
      createdAt: new Date().toISOString()
    };

    db.playlists.push(newPlaylist);
    writeDB(db);
    res.status(201).json(newPlaylist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update playlist
router.put('/:id', (req, res) => {
  try {
    const { name, description, coverUrl } = req.body;
    const db = readDB();
    const playlist = (db.playlists || []).find(p => p.id === req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    if (name) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (coverUrl) playlist.coverUrl = coverUrl;

    writeDB(db);
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE playlist
router.delete('/:id', (req, res) => {
  try {
    const db = readDB();
    const index = (db.playlists || []).findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Playlist not found' });

    if (db.playlists[index].isLikedSongs) {
      return res.status(400).json({ error: 'Cannot delete default Liked Songs playlist' });
    }

    db.playlists.splice(index, 1);
    
    // Also remove from any folder
    (db.folders || []).forEach(f => {
      f.playlistIds = (f.playlistIds || []).filter(pid => pid !== req.params.id);
    });

    writeDB(db);
    res.json({ message: 'Playlist deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST toggle song in playlist
router.post('/:id/songs', (req, res) => {
  try {
    const { songId } = req.body;
    if (!songId) return res.status(400).json({ error: 'Song ID is required' });

    const db = readDB();
    const playlist = (db.playlists || []).find(p => p.id === req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const idx = playlist.songIds.indexOf(songId);
    let added = false;
    if (idx > -1) {
      playlist.songIds.splice(idx, 1);
    } else {
      playlist.songIds.push(songId);
      added = true;
    }

    writeDB(db);
    res.json({ playlistId: playlist.id, songIds: playlist.songIds, added });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- FOLDER ROUTES ---

// GET user folders
router.get('/folders/all', (req, res) => {
  const userId = req.query.userId || 'user_demo';
  const db = readDB();
  const folders = (db.folders || []).filter(f => f.userId === userId);
  res.json(folders);
});

// GET single folder with populated songs and playlists
router.get('/folders/:id', (req, res) => {
  const db = readDB();
  const folder = (db.folders || []).find(f => f.id === req.params.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });

  const songs = (db.songs || []).filter(s => (folder.songIds || []).includes(s.id));
  const playlists = (db.playlists || []).filter(p => (folder.playlistIds || []).includes(p.id));

  res.json({ ...folder, songs, playlists });
});

// POST create folder
router.post('/folders/create', (req, res) => {
  try {
    const { name, userId = 'user_demo' } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name is required' });

    const db = readDB();
    const newFolder = {
      id: 'folder_' + Date.now(),
      userId,
      name,
      playlistIds: [],
      songIds: [],
      createdAt: new Date().toISOString()
    };

    db.folders = db.folders || [];
    db.folders.push(newFolder);
    writeDB(db);
    res.status(201).json(newFolder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT rename folder
router.put('/folders/:id', (req, res) => {
  try {
    const { name } = req.body;
    const db = readDB();
    const folder = (db.folders || []).find(f => f.id === req.params.id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    if (name) folder.name = name;
    writeDB(db);
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE folder
router.delete('/folders/:id', (req, res) => {
  try {
    const db = readDB();
    const idx = (db.folders || []).findIndex(f => f.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Folder not found' });

    db.folders.splice(idx, 1);
    writeDB(db);
    res.json({ message: 'Folder deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add/remove song to folder
router.post('/folders/:id/songs', (req, res) => {
  try {
    const { songId } = req.body;
    if (!songId) return res.status(400).json({ error: 'Song ID is required' });

    const db = readDB();
    const folder = (db.folders || []).find(f => f.id === req.params.id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    folder.songIds = folder.songIds || [];
    const idx = folder.songIds.indexOf(songId);
    let added = false;
    if (idx > -1) {
      folder.songIds.splice(idx, 1);
    } else {
      folder.songIds.push(songId);
      added = true;
    }

    writeDB(db);
    res.json({ folderId: folder.id, songIds: folder.songIds, added });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
