const express = require('express');
const router = express.Router();
const { readDB } = require('../db');

// GET all artists
router.get('/', (req, res) => {
  const db = readDB();
  res.json(db.artists || []);
});

// GET single artist with tracks and albums
router.get('/:id', (req, res) => {
  const db = readDB();
  const artist = (db.artists || []).find(a => a.id === req.params.id);
  if (!artist) return res.status(404).json({ error: 'Artist not found' });

  const songs = (db.songs || []).filter(s => s.artistId === artist.id || s.artist.toLowerCase() === artist.name.toLowerCase());
  const albums = (db.albums || []).filter(al => al.artistId === artist.id || al.artist.toLowerCase() === artist.name.toLowerCase());

  res.json({ ...artist, songs, albums });
});

// GET all albums
router.get('/albums/all', (req, res) => {
  const db = readDB();
  res.json(db.albums || []);
});

// GET single album with songs
router.get('/albums/:id', (req, res) => {
  const db = readDB();
  const album = (db.albums || []).find(a => a.id === req.params.id);
  if (!album) return res.status(404).json({ error: 'Album not found' });

  const songs = (db.songs || []).filter(s => s.albumId === album.id || s.album.toLowerCase() === album.title.toLowerCase());
  res.json({ ...album, songs });
});

module.exports = router;
