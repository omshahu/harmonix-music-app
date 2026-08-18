const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'database.json');

// Ensure directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const defaultData = {
  users: [
    {
      id: 'user_demo',
      username: 'Alex Harmony',
      email: 'alex@harmonix.com',
      password: '$2a$10$e846ZtM8C9L.W0XQ3Y0K.e9f7g8h9i0j1k2l3m4n5o6p7q8r9s', // demo hashed password
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      createdAt: new Date().toISOString()
    }
  ],
  songs: [],
  artists: [],
  albums: [],
  playlists: [
    {
      id: 'playlist_liked',
      userId: 'user_demo',
      name: 'Liked Songs',
      description: 'Your favorite ad-free tracks',
      coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=500&q=80',
      isLikedSongs: true,
      songIds: ['song_1', 'song_3', 'song_5'],
      createdAt: new Date().toISOString()
    }
  ],
  folders: [
    {
      id: 'folder_1',
      userId: 'user_demo',
      name: 'Chill Vibes & Lo-Fi',
      playlistIds: ['playlist_liked'],
      songIds: ['song_1', 'song_2'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'folder_2',
      userId: 'user_demo',
      name: 'Cyberpunk & Synthwave',
      playlistIds: [],
      songIds: ['song_3', 'song_4'],
      createdAt: new Date().toISOString()
    }
  ],
  downloads: []
};

function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      writeDB(defaultData);
      return defaultData;
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database file:', error);
    return defaultData;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing to database file:', error);
  }
}

module.exports = {
  readDB,
  writeDB,
  DB_PATH
};
