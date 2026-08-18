/* ==========================================================================
   HARMONIX SPOTIFY CLONE - REAL YOUTUBE AUDIO ENGINE & APP CONTROLLER
   ========================================================================== */

let currentUser = JSON.parse(localStorage.getItem('harmonix_user')) || { id: 'user_demo', username: 'Alex Harmony', email: 'alex@harmonix.com' };
let currentView = 'home';
let viewParams = {};
let selectedLanguageFilter = 'All';

let allSongs = [];
let allArtists = [];
let allAlbums = [];
let allPlaylists = [];
let allFolders = [];
let userDownloads = [];
let userLikedSongIds = [];
let searchTimeout = null;
window.currentSearchResults = [];

// Global State Initializer
document.addEventListener('DOMContentLoaded', async () => {
  await fetchUserData();
  await loadAppData();
  navigateTo('home');
});

// Fetch User Profile Session
async function fetchUserData() {
  try {
    const res = await fetch(`/api/auth/me?userId=${currentUser.id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        currentUser = data.user;
        localStorage.setItem('harmonix_user', JSON.stringify(currentUser));
      }
      updateUserUI();
    }
  } catch (e) {
    console.warn('Auth fetch fallback:', e);
  }
}

function updateUserUI() {
  const userEl = document.getElementById('user-display-name');
  const avatarEl = document.getElementById('user-avatar-img');
  if (userEl) userEl.textContent = currentUser.username;
  if (avatarEl) avatarEl.src = currentUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80";
}

// Load Core Data from Backend API (ISOLATED BY USER ID)
async function loadAppData() {
  try {
    const [songsRes, artistsRes, albumsRes, playlistsRes, foldersRes, downloadsRes] = await Promise.all([
      fetch(`/api/songs?userId=${currentUser.id}`),
      fetch('/api/artists'),
      fetch('/api/albums'),
      fetch(`/api/playlists?userId=${currentUser.id}`),
      fetch(`/api/folders?userId=${currentUser.id}`),
      fetch(`/api/downloads?userId=${currentUser.id}`)
    ]);

    if (songsRes.ok) window.allSongs = allSongs = await songsRes.json();
    if (artistsRes.ok) allArtists = await artistsRes.json();
    if (albumsRes.ok) allAlbums = await albumsRes.json();
    if (playlistsRes.ok) allPlaylists = await playlistsRes.json();
    if (foldersRes.ok) allFolders = await foldersRes.json();
    if (downloadsRes.ok) userDownloads = await downloadsRes.json();

    const likedPlaylist = allPlaylists.find(p => p.isLikedSongs);
    if (likedPlaylist) {
      userLikedSongIds = likedPlaylist.songIds || [];
    } else {
      userLikedSongIds = [];
    }

    renderSidebarPlaylists();
  } catch (e) {
    console.error('Error loading app data:', e);
  }
}

// --- GOOGLE OAUTH LOGIN MODAL & EXECUTION ---
function openGoogleAuthModal() {
  const modal = document.getElementById('google-auth-modal');
  if (modal) modal.classList.add('open');
}

function closeGoogleAuthModal() {
  const modal = document.getElementById('google-auth-modal');
  if (modal) modal.classList.remove('open');
}

async function executeGoogleLogin(email, username) {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username })
    });

    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      localStorage.setItem('harmonix_user', JSON.stringify(currentUser));
      updateUserUI();
      closeGoogleAuthModal();
      await loadAppData();
      navigateTo('home');
      alert(`Logged in with Google as ${currentUser.username}!`);
    } else {
      alert('Google login failed');
    }
  } catch (e) {
    console.error('Google login error:', e);
  }
}

function submitCustomGoogleLogin() {
  const input = document.getElementById('custom-google-email');
  const email = input ? input.value.trim() : '';
  if (!email || !email.includes('@')) {
    alert('Please enter a valid Gmail / Google email address');
    return;
  }
  const username = email.split('@')[0].replace('.', ' ').toUpperCase();
  executeGoogleLogin(email, username);
}

// --- VIEW NAVIGATION CONTROLLER (MOBILE & DESKTOP SYNC) ---
function navigateTo(view, params = {}) {
  currentView = view;
  viewParams = params;

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));

  const activeNav = document.getElementById(`nav-${view}`);
  if (activeNav) activeNav.classList.add('active');

  const activeMobNav = document.getElementById(`mob-nav-${view}`);
  if (activeMobNav) activeMobNav.classList.add('active');

  const searchWrap = document.getElementById('header-search-wrap');
  if (searchWrap) {
    searchWrap.style.display = (view === 'search') ? 'block' : 'none';
  }

  const container = document.getElementById('content-view');
  if (!container) return;

  switch (view) {
    case 'home':
      renderHomeView(container);
      break;
    case 'search':
      renderSearchView(container);
      break;
    case 'library':
      renderLibraryView(container);
      break;
    case 'playlist':
      renderPlaylistView(container, params.id);
      break;
    case 'folder':
      renderFolderView(container, params.id);
      break;
    case 'artist':
      renderArtistView(container, params.id);
      break;
    case 'album':
      renderAlbumView(container, params.id);
      break;
    case 'downloads':
      renderDownloadsView(container);
      break;
    default:
      renderHomeView(container);
  }

  if (window.lucide) lucide.createIcons();
}

function historyBack() { window.history.back(); }
function historyForward() { window.history.forward(); }

function filterByLanguage(lang) {
  selectedLanguageFilter = lang;
  navigateTo(currentView, viewParams);
}

// --- RENDER SIDEBAR PLAYLISTS & FOLDERS ---
function renderSidebarPlaylists() {
  const container = document.getElementById('sidebar-playlists-list');
  if (!container) return;

  let html = '';

  const likedPlaylist = allPlaylists.find(p => p.isLikedSongs);
  const likedCount = likedPlaylist ? (likedPlaylist.songIds || []).length : 0;
  html += `
    <div class="playlist-item" onclick="navigateTo('playlist', { id: '${likedPlaylist ? likedPlaylist.id : 'playlist_liked'}' })">
      <div class="playlist-img liked-gradient"><i data-lucide="heart" style="width: 20px; height: 20px; fill: #fff;"></i></div>
      <div class="playlist-meta">
        <span class="playlist-title">Liked Songs</span>
        <span class="playlist-sub">Playlist • ${likedCount} tracks</span>
      </div>
    </div>
  `;

  allFolders.forEach(folder => {
    html += `
      <div class="playlist-item" onclick="navigateTo('folder', { id: '${folder.id}' })">
        <div class="playlist-img" style="background: #282828; color: var(--color-primary); display: flex; align-items: center; justify-content: center;">
          <i data-lucide="folder"></i>
        </div>
        <div class="playlist-meta">
          <span class="playlist-title">${escapeHtml(folder.name)}</span>
          <span class="playlist-sub">Folder • ${(folder.songIds || []).length} songs</span>
        </div>
      </div>
    `;
  });

  allPlaylists.filter(p => !p.isLikedSongs).forEach(playlist => {
    html += `
      <div class="playlist-item" onclick="navigateTo('playlist', { id: '${playlist.id}' })">
        <img src="${playlist.coverUrl}" class="playlist-img">
        <div class="playlist-meta">
          <span class="playlist-title">${escapeHtml(playlist.name)}</span>
          <span class="playlist-sub">Playlist • ${(playlist.songIds || []).length} songs</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

// --- RENDER HOME VIEW ---
function renderHomeView(container) {
  const greeting = getGreeting();

  let filteredSongsList = allSongs;
  if (selectedLanguageFilter !== 'All') {
    filteredSongsList = allSongs.filter(s => s.language === selectedLanguageFilter);
  }

  let html = `
    <!-- Language Selection Filter Pills -->
    <div style="display: flex; gap: 10px; margin-bottom: 24px; overflow-x: auto; padding-bottom: 4px;">
      ${['All', 'Hindi', 'Marathi', 'English'].map(lang => `
        <button onclick="filterByLanguage('${lang}')" style="background: ${selectedLanguageFilter === lang ? 'var(--color-primary)' : '#242424'}; color: ${selectedLanguageFilter === lang ? '#000' : '#fff'}; border: none; padding: 8px 18px; border-radius: 9999px; font-weight: 700; font-size: 0.88rem; cursor: pointer; transition: var(--transition-fast);">
          ${lang === 'Hindi' ? '🇮🇳 Hindi (हिन्दी)' : lang === 'Marathi' ? '🚩 Marathi (मराठी)' : lang === 'English' ? '🌍 English' : 'All Languages'}
        </button>
      `).join('')}
    </div>

    <div class="section-title">
      <span>${greeting}, ${escapeHtml(currentUser.username)}</span>
      <span style="font-size: 0.85rem; color: var(--color-primary); font-weight: 600;">100% Ad-Free Real YouTube Audio Stream</span>
    </div>

    <!-- Quick Play Grid -->
    <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); margin-bottom: 32px;">
  `;

  filteredSongsList.slice(0, 6).forEach(song => {
    html += `
      <div class="playlist-item" style="background: rgba(255,255,255,0.06); padding: 12px; border-radius: 8px; cursor: pointer;" onclick="playTrackById('${song.id}')">
        <img src="${song.coverUrl}" class="playlist-img" style="width: 56px; height: 56px; border-radius: 6px;">
        <div class="playlist-meta" style="flex: 1;">
          <span class="playlist-title" style="font-size: 0.95rem;">${escapeHtml(song.title)}</span>
          <span class="playlist-sub">${escapeHtml(song.artist)} • <span style="color: var(--color-primary); font-weight: 600;">${song.language || 'Music'}</span></span>
        </div>
        <button class="circle-btn" style="background: var(--color-primary); color: #000; border: none; width: 40px; height: 40px;" onclick="event.stopPropagation(); playTrackById('${song.id}')"><i data-lucide="play" style="fill: #000;"></i></button>
      </div>
    `;
  });

  html += `
    </div>

    <!-- Hindi Music Section -->
    ${selectedLanguageFilter === 'All' || selectedLanguageFilter === 'Hindi' ? `
      <div class="section-title">🇮🇳 Trending Hindi Hits (हिन्दी)</div>
      ${renderTrackTable(allSongs.filter(s => s.language === 'Hindi'))}
    ` : ''}

    <!-- Marathi Music Section -->
    ${selectedLanguageFilter === 'All' || selectedLanguageFilter === 'Marathi' ? `
      <div class="section-title" style="margin-top: 32px;">🚩 Marathi Blockbusters (मराठी)</div>
      ${renderTrackTable(allSongs.filter(s => s.language === 'Marathi'))}
    ` : ''}

    <!-- English Music Section -->
    ${selectedLanguageFilter === 'All' || selectedLanguageFilter === 'English' ? `
      <div class="section-title" style="margin-top: 32px;">🌍 Global English Chartbusters</div>
      ${renderTrackTable(allSongs.filter(s => s.language === 'English'))}
    ` : ''}

    <div class="section-title" style="margin-top: 36px;">Popular Artists</div>
    <div class="cards-grid">
  `;

  allArtists.forEach(artist => {
    html += `
      <div class="media-card" onclick="navigateTo('artist', { id: '${artist.id}' })">
        <div class="card-img-wrap artist-circle">
          <img src="${artist.image}">
          <button class="card-play-btn"><i data-lucide="play" style="fill: #000;"></i></button>
        </div>
        <div class="card-info">
          <div class="card-title">${escapeHtml(artist.name)}</div>
          <div class="card-sub">Artist • ${(artist.monthlyListeners || 0).toLocaleString()} listeners</div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

// --- RENDER SEARCH VIEW (DIRECT CLEAN TRACK RESULTS - NO ALBUM HERO BANNERS) ---
function renderSearchView(container) {
  let html = `
    <!-- Quick Search Pill Shortcuts -->
    <div style="display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px;">
      <button onclick="handleSearchInput('Kesariya')" style="background: rgba(29, 185, 84, 0.15); border: 1px solid var(--color-primary); color: var(--color-primary); padding: 8px 16px; border-radius: 9999px; font-weight: 700; cursor: pointer;">🎵 Kesariya</button>
      <button onclick="handleSearchInput('Zingaat Sairat')" style="background: rgba(29, 185, 84, 0.15); border: 1px solid var(--color-primary); color: var(--color-primary); padding: 8px 16px; border-radius: 9999px; font-weight: 700; cursor: pointer;">🚩 Zingaat</button>
      <button onclick="handleSearchInput('Arijit Singh Hits')" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 8px 16px; border-radius: 9999px; font-weight: 700; cursor: pointer;">🎤 Arijit Singh</button>
      <button onclick="handleSearchInput('Blinding Lights')" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 8px 16px; border-radius: 9999px; font-weight: 700; cursor: pointer;">🌍 Blinding Lights</button>
    </div>

    <div id="search-results-area">
      <div class="section-title">Search Any Song across YouTube & Library</div>
      <p style="color: var(--text-sub); margin-bottom: 20px;">Type any song or artist name to instantly stream real ad-free audio tracks!</p>
      ${renderTrackTable(allSongs)}
    </div>
  `;

  container.innerHTML = html;
}

// --- REAL YOUTUBE & LOCAL TRACK SEARCH ENGINE ---
function handleSearchInput(query) {
  const searchInput = document.getElementById('search-input');
  if (searchInput && searchInput.value !== query) {
    searchInput.value = query;
  }

  const area = document.getElementById('search-results-area');
  if (!area) return;

  if (!query.trim()) {
    window.currentSearchResults = [];
    area.innerHTML = `
      <div class="section-title">All Available Songs</div>
      ${renderTrackTable(allSongs)}
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  area.innerHTML = `<div class="section-title" style="color: var(--color-primary);">Searching real audio tracks for "${escapeHtml(query)}"...</div>`;

  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`/api/search/youtube?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const ytResults = await res.json();

        const q = query.toLowerCase();
        const localMatches = allSongs.filter(s =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          (s.language && s.language.toLowerCase().includes(q))
        );

        const combined = [...ytResults, ...localMatches];
        window.currentSearchResults = combined;

        // Render DIRECT CLEAN TRACK TABLE - NO ALBUM BANNERS!
        let searchHTML = `
          <div class="section-title" style="display: flex; align-items: center; justify-content: space-between;">
            <span>Search Track Results for "${escapeHtml(query)}" (${combined.length} songs)</span>
            ${combined.length > 0 ? `<button class="btn-primary" onclick="playTrackList(window.currentSearchResults)"><i data-lucide="play" style="fill: #000;"></i> Play All Tracks</button>` : ''}
          </div>
          ${renderTrackTable(combined)}
        `;

        area.innerHTML = searchHTML;
        if (window.lucide) lucide.createIcons();
      }
    } catch (e) {
      console.error('YouTube search error:', e);
    }
  }, 300);
}

// --- RENDER LIBRARY VIEW ---
function renderLibraryView(container) {
  let html = `
    <div class="section-title" style="display: flex; align-items: center; justify-content: space-between;">
      <span>Your Library & Folders (${escapeHtml(currentUser.username)})</span>
      <button class="btn-primary" onclick="openCreateFolderModal()"><i data-lucide="folder-plus" style="width: 16px; height: 16px;"></i> New Folder</button>
    </div>

    <div class="section-title" style="font-size: 1.1rem; color: var(--text-sub);">Custom Folders</div>
    <div class="cards-grid" style="margin-bottom: 32px;">
  `;

  if (allFolders.length === 0) {
    html += `<p style="color: var(--text-sub);">No custom folders created yet. Click "New Folder" to create your first folder!</p>`;
  } else {
    allFolders.forEach(folder => {
      html += `
        <div class="media-card" onclick="navigateTo('folder', { id: '${folder.id}' })">
          <div class="card-img-wrap" style="background: linear-gradient(135deg, #181818, #282828); display: flex; align-items: center; justify-content: center; color: var(--color-primary);">
            <i data-lucide="folder" style="width: 64px; height: 64px;"></i>
          </div>
          <div class="card-info">
            <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
              <span>${escapeHtml(folder.name)}</span>
              <button class="icon-btn" onclick="event.stopPropagation(); deleteFolderPrompt('${folder.id}')" title="Delete Folder"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button>
            </div>
            <div class="card-sub">${(folder.songIds || []).length} songs organized</div>
          </div>
        </div>
      `;
    });
  }

  html += `
    </div>

    <div class="section-title" style="font-size: 1.1rem; color: var(--text-sub);">Your Playlists</div>
    <div class="cards-grid">
  `;

  allPlaylists.forEach(playlist => {
    html += `
      <div class="media-card" onclick="navigateTo('playlist', { id: '${playlist.id}' })">
        <div class="card-img-wrap ${playlist.isLikedSongs ? 'liked-gradient-hero' : ''}">
          ${playlist.isLikedSongs ? `<i data-lucide="heart" style="width: 64px; height: 64px; fill: #fff;"></i>` : `<img src="${playlist.coverUrl}">`}
          <button class="card-play-btn"><i data-lucide="play" style="fill: #000;"></i></button>
        </div>
        <div class="card-info">
          <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>${escapeHtml(playlist.name)}</span>
            ${!playlist.isLikedSongs ? `<button class="icon-btn" onclick="event.stopPropagation(); deletePlaylistPrompt('${playlist.id}')" title="Delete Playlist"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button>` : ''}
          </div>
          <div class="card-sub">${(playlist.songIds || []).length} tracks</div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

// --- RENDER FOLDER VIEW ---
function renderFolderView(container, folderId) {
  const folder = allFolders.find(f => f.id === folderId);
  if (!folder) {
    container.innerHTML = `<p>Folder not found.</p>`;
    return;
  }

  const folderSongs = allSongs.filter(s => (folder.songIds || []).includes(s.id));

  let html = `
    <div class="hero-banner" style="background: linear-gradient(180deg, rgba(16, 185, 129, 0.35) 0%, rgba(18, 18, 18, 0.95) 100%);">
      <div class="hero-cover" style="background: linear-gradient(135deg, #181818, #282828); display: flex; align-items: center; justify-content: center; color: var(--color-primary);">
        <i data-lucide="folder" style="width: 96px; height: 96px;"></i>
      </div>
      <div class="hero-info">
        <span class="hero-tag">Custom Folder</span>
        <h1 class="hero-title">${escapeHtml(folder.name)}</h1>
        <div class="hero-meta">
          <span>Owner: ${escapeHtml(currentUser.username)}</span> • 
          <span>${folderSongs.length} songs</span>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 12px;">
          <button class="btn-primary" onclick="playTrackList(allSongs.filter(s => ('${(folder.songIds || []).join(',')}').split(',').includes(s.id)))"><i data-lucide="play" style="fill: #000;"></i> Play Folder</button>
          <button class="circle-btn" title="Rename Folder" onclick="renameFolderPrompt('${folder.id}')"><i data-lucide="edit"></i></button>
          <button class="circle-btn" title="Delete Folder" onclick="deleteFolderPrompt('${folder.id}')"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    </div>

    <div class="section-title">Songs in Folder</div>
    ${renderTrackTable(folderSongs, folder.id, 'folder')}
  `;

  container.innerHTML = html;
}

// --- RENDER PLAYLIST VIEW ---
function renderPlaylistView(container, playlistId) {
  const playlist = allPlaylists.find(p => p.id === playlistId);
  if (!playlist) {
    container.innerHTML = `<p>Playlist not found.</p>`;
    return;
  }

  const playlistSongs = allSongs.filter(s => (playlist.songIds || []).includes(s.id));

  let html = `
    <div class="hero-banner">
      ${playlist.isLikedSongs ? `
        <div class="hero-cover liked-gradient-hero">
          <i data-lucide="heart" style="width: 80px; height: 80px; fill: #fff;"></i>
        </div>
      ` : `<img src="${playlist.coverUrl}" class="hero-cover">`}
      <div class="hero-info">
        <span class="hero-tag">Playlist</span>
        <h1 class="hero-title">${escapeHtml(playlist.name)}</h1>
        <p style="color: var(--text-sub);">${escapeHtml(playlist.description || '')}</p>
        <div class="hero-meta">
          <span>Owner: ${escapeHtml(currentUser.username)}</span> • 
          <span>${playlistSongs.length} tracks</span>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 12px;">
          <button class="btn-primary" onclick="playTrackList(allSongs.filter(s => ('${(playlist.songIds || []).join(',')}').split(',').includes(s.id)))"><i data-lucide="play" style="fill: #000;"></i> Play All</button>
          ${!playlist.isLikedSongs ? `<button class="circle-btn" title="Delete Playlist" onclick="deletePlaylistPrompt('${playlist.id}')"><i data-lucide="trash-2"></i></button>` : ''}
        </div>
      </div>
    </div>

    ${renderTrackTable(playlistSongs, playlist.id, 'playlist')}
  `;

  container.innerHTML = html;
}

// --- RENDER ARTIST VIEW ---
function renderArtistView(container, artistId) {
  const artist = allArtists.find(a => a.id === artistId);
  if (!artist) {
    container.innerHTML = `<p>Artist not found.</p>`;
    return;
  }

  const artistSongs = allSongs.filter(s => s.artistId === artist.id || s.artist.toLowerCase().includes(artist.name.toLowerCase()));

  let html = `
    <div class="hero-banner" style="background: linear-gradient(180deg, rgba(29, 185, 84, 0.5) 0%, rgba(18, 18, 18, 0.95) 100%);">
      <img src="${artist.image}" class="hero-cover" style="border-radius: 50%;">
      <div class="hero-info">
        <span class="hero-tag" style="display: flex; align-items: center; gap: 6px;"><i data-lucide="check-circle-2" style="color: var(--color-primary); fill: var(--color-primary);"></i> Verified Artist</span>
        <h1 class="hero-title">${escapeHtml(artist.name)}</h1>
        <p style="color: var(--text-sub); max-width: 600px;">${escapeHtml(artist.bio || '')}</p>
        <div class="hero-meta">
          <span>${(artist.monthlyListeners || 0).toLocaleString()} monthly listeners</span>
        </div>
      </div>
    </div>

    <div class="section-title">Popular Tracks</div>
    ${renderTrackTable(artistSongs)}
  `;

  container.innerHTML = html;
}

// --- RENDER ALBUM VIEW ---
function renderAlbumView(container, albumId) {
  const album = allAlbums.find(a => a.id === albumId);
  if (!album) {
    container.innerHTML = `<p>Album not found.</p>`;
    return;
  }

  const albumSongs = allSongs.filter(s => s.albumId === album.id || s.album.toLowerCase() === album.title.toLowerCase());

  let html = `
    <div class="hero-banner">
      <img src="${album.coverUrl}" class="hero-cover">
      <div class="hero-info">
        <span class="hero-tag">Album</span>
        <h1 class="hero-title">${escapeHtml(album.title)}</h1>
        <div class="hero-meta">
          <span>${escapeHtml(album.artist)}</span> • 
          <span>${album.year}</span> • 
          <span>${albumSongs.length} songs</span>
        </div>
      </div>
    </div>

    ${renderTrackTable(albumSongs)}
  `;

  container.innerHTML = html;
}

// --- RENDER IN-APP DOWNLOADS VIEW ---
function renderDownloadsView(container) {
  const downloadedSongIds = userDownloads.map(d => d.songId);
  let downloadedSongs = allSongs.filter(s => downloadedSongIds.includes(s.id));

  userDownloads.forEach(d => {
    if (d.song && !downloadedSongs.some(s => s.id === d.song.id)) {
      downloadedSongs.push(d.song);
    }
  });

  let html = `
    <div class="hero-banner" style="background: linear-gradient(180deg, rgba(29, 185, 84, 0.3) 0%, rgba(18, 18, 18, 0.95) 100%);">
      <div class="hero-cover" style="background: var(--color-primary); display: flex; align-items: center; justify-content: center; color: #000;">
        <i data-lucide="arrow-down-circle" style="width: 80px; height: 80px;"></i>
      </div>
      <div class="hero-info">
        <span class="hero-tag">In-App Offline Library (${escapeHtml(currentUser.username)})</span>
        <h1 class="hero-title">Downloaded Songs</h1>
        <p style="color: var(--text-sub);">Your personal downloaded songs saved in your account!</p>
        <div class="hero-meta">
          <span>${downloadedSongs.length} Songs Downloaded</span>
        </div>
        ${downloadedSongs.length > 0 ? `
          <div style="margin-top: 12px;">
            <button class="btn-primary" onclick="playTrackList(userDownloads.map(d => d.song).filter(Boolean))"><i data-lucide="play" style="fill: #000;"></i> Play All Downloaded Tracks</button>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="section-title">Downloaded Tracklist</div>
  `;

  if (downloadedSongs.length === 0) {
    html += `
      <div style="padding: 32px 0; text-align: center; color: var(--text-sub);">
        <i data-lucide="download" style="width: 48px; height: 48px; color: var(--color-primary); margin-bottom: 12px;"></i>
        <h3>No In-App Downloads Yet</h3>
        <p>Click the download icon on any song to save it to your in-app Downloads section!</p>
      </div>
    `;
  } else {
    html += renderTrackTable(downloadedSongs, null, 'download');
  }

  container.innerHTML = html;
}

// --- HELPER RENDER TRACK TABLE ---
function renderTrackTable(songs, ownerId = null, ownerType = null) {
  if (!songs || songs.length === 0) {
    return `<p style="color: var(--text-sub); padding: 16px 0;">No tracks found matching criteria.</p>`;
  }

  let html = `
    <table class="track-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Title</th>
          <th>Language</th>
          <th>Source</th>
          <th style="text-align: right;">Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  songs.forEach((song, index) => {
    const isLiked = userLikedSongIds.includes(song.id);
    const langBadgeColor = song.language === 'Hindi' ? '#ff9933' : song.language === 'Marathi' ? '#ff6600' : '#1DB954';
    const isYT = song.isYouTube || (song.id && song.id.startsWith('yt_'));

    html += `
      <tr class="track-row" onclick="playTrackById('${song.id}')">
        <td class="track-num">${index + 1}</td>
        <td>
          <div class="track-main">
            <img src="${song.coverUrl}" class="track-img">
            <div class="track-name-wrap">
              <span class="track-name">${escapeHtml(song.title)}</span>
              <span class="track-artist">${escapeHtml(song.artist)}</span>
            </div>
          </div>
        </td>
        <td>
          <span style="background: rgba(255,255,255,0.08); color: ${langBadgeColor}; font-weight: 700; font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; border: 1px solid ${langBadgeColor}40;">
            ${song.language || 'Music'}
          </span>
        </td>
        <td>
          <span style="color: ${isYT ? '#FF0000' : 'var(--color-primary)'}; font-weight: 700; font-size: 0.8rem;">
            ${isYT ? 'YouTube Stream' : 'Harmonix Local'}
          </span>
        </td>
        <td style="text-align: right;" onclick="event.stopPropagation()">
          <div class="track-actions" style="justify-content: flex-end;">
            <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLikeTrack('${song.id}')" title="Like Track">
              <i data-lucide="heart" style="fill: ${isLiked ? 'var(--color-primary)' : 'none'}"></i>
            </button>
            <button class="icon-btn" onclick="addSongToFolderPrompt('${song.id}')" title="Add to Folder"><i data-lucide="folder-plus"></i></button>
            <button class="icon-btn" onclick="downloadTrackById('${song.id}')" title="Download Song to Web App & PC"><i data-lucide="download"></i></button>
            ${ownerType === 'folder' ? `<button class="icon-btn" onclick="removeTrackFromFolder('${ownerId}', '${song.id}')" title="Remove from Folder"><i data-lucide="minus-circle"></i></button>` : ''}
            ${ownerType === 'download' ? `<button class="icon-btn" onclick="removeFromDownloads('${song.id}')" title="Remove from Downloads"><i data-lucide="trash-2" style="color: #ef4444;"></i></button>` : `<button class="icon-btn" onclick="deleteTrackById('${song.id}')" title="Delete Track"><i data-lucide="trash-2" style="color: #ef4444;"></i></button>`}
          </div>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
}

// --- TRACK PLAYBACK ACTIONS ---
function playSongObject(song) {
  if (song && window.audioEngine) {
    if (!allSongs.some(s => s.id === song.id)) {
      allSongs.unshift(song);
    }
    window.audioEngine.playTrack(song, allSongs);
  }
}

function playTrackById(songId) {
  let song = allSongs.find(s => s.id === songId);
  if (!song && window.currentSearchResults) {
    song = window.currentSearchResults.find(s => s.id === songId);
  }

  if (song && window.audioEngine) {
    if (!allSongs.some(s => s.id === song.id)) {
      allSongs.unshift(song);
    }
    window.audioEngine.playTrack(song, allSongs);
  }
}

function playTrackList(songs) {
  if (songs && songs.length > 0 && window.audioEngine) {
    songs.forEach(s => {
      if (!allSongs.some(item => item.id === s.id)) allSongs.unshift(s);
    });
    window.audioEngine.playTrack(songs[0], songs);
  }
}

// --- LIKE / FAVORITE ACTION (USER ISOLATED) ---
async function toggleLikeTrack(songId) {
  try {
    const res = await fetch(`/api/songs/like/${songId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id })
    });
    if (res.ok) {
      const data = await res.json();
      userLikedSongIds = data.likedSongIds;
      await loadAppData();
      navigateTo(currentView, viewParams);
    }
  } catch (e) {
    console.error('Error toggling like:', e);
  }
}

function toggleCurrentTrackLike() {
  if (window.audioEngine && window.audioEngine.currentTrack) {
    toggleLikeTrack(window.audioEngine.currentTrack.id);
  }
}

function updateCurrentTrackLikeState(songId) {
  const btn = document.getElementById('np-like-btn');
  if (!btn) return;
  const isLiked = userLikedSongIds.includes(songId);
  btn.classList.toggle('liked', isLiked);
  btn.innerHTML = `<i data-lucide="heart" style="fill: ${isLiked ? 'var(--color-primary)' : 'none'}"></i>`;
  if (window.lucide) lucide.createIcons();
}

// --- DELETE SONG ACTION ---
async function deleteTrackById(songId) {
  if (!confirm('Are you sure you want to delete this track from your library?')) return;

  try {
    const res = await fetch(`/api/songs/${songId}?userId=${currentUser.id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadAppData();
      navigateTo(currentView, viewParams);
    }
  } catch (e) {
    console.error('Delete song error:', e);
  }
}

// --- DOWNLOAD TRACK TO IN-APP DOWNLOADS & COMPUTER ---
async function downloadTrackById(songId) {
  let song = allSongs.find(s => s.id === songId);
  if (!song && window.currentSearchResults) {
    song = window.currentSearchResults.find(s => s.id === songId);
  }

  try {
    await fetch('/api/downloads/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId, userId: currentUser.id, song })
    });
    await loadAppData();
  } catch (e) {
    console.warn('In-app downloads register note:', e);
  }

  window.open(`/api/songs/download/${songId}`, '_blank');
}

function downloadCurrentTrack() {
  if (window.audioEngine && window.audioEngine.currentTrack) {
    downloadTrackById(window.audioEngine.currentTrack.id);
  }
}

async function removeFromDownloads(songId) {
  try {
    const res = await fetch(`/api/downloads/${songId}?userId=${currentUser.id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadAppData();
      navigateTo('downloads');
    }
  } catch (e) {
    console.error('Remove download error:', e);
  }
}

// --- FOLDER & PLAYLIST CRUD PROMPTS (USER ISOLATED) ---
function openCreateFolderModal() {
  const modal = document.getElementById('folder-modal');
  if (modal) modal.classList.add('open');
}

function closeCreateFolderModal() {
  const modal = document.getElementById('folder-modal');
  if (modal) modal.classList.remove('open');
}

async function submitCreateFolder() {
  const input = document.getElementById('folder-name-input');
  const name = input ? input.value.trim() : '';
  if (!name) return;

  try {
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, userId: currentUser.id })
    });
    if (res.ok) {
      closeCreateFolderModal();
      input.value = '';
      await loadAppData();
      navigateTo('library');
    }
  } catch (e) {
    console.error('Create folder error:', e);
  }
}

async function createQuickPlaylist() {
  const name = prompt('Enter new Playlist name:');
  if (!name) return;

  try {
    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, userId: currentUser.id })
    });
    if (res.ok) {
      await loadAppData();
      navigateTo('library');
    }
  } catch (e) {
    console.error('Create playlist error:', e);
  }
}

async function renameFolderPrompt(folderId) {
  const newName = prompt('Enter new folder name:');
  if (!newName) return;

  try {
    const res = await fetch(`/api/folders/${folderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, userId: currentUser.id })
    });
    if (res.ok) {
      await loadAppData();
      navigateTo('folder', { id: folderId });
    }
  } catch (e) {
    console.error('Rename folder error:', e);
  }
}

async function deleteFolderPrompt(folderId) {
  if (!confirm('Are you sure you want to delete this folder?')) return;

  try {
    const res = await fetch(`/api/folders/${folderId}?userId=${currentUser.id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadAppData();
      navigateTo('library');
    }
  } catch (e) {
    console.error('Delete folder error:', e);
  }
}

async function deletePlaylistPrompt(playlistId) {
  if (!confirm('Are you sure you want to delete this playlist?')) return;

  try {
    const res = await fetch(`/api/playlists/${playlistId}?userId=${currentUser.id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadAppData();
      navigateTo('library');
    }
  } catch (e) {
    console.error('Delete playlist error:', e);
  }
}

async function addSongToFolderPrompt(songId) {
  if (allFolders.length === 0) {
    if (confirm('No custom folders found. Create one now?')) {
      openCreateFolderModal();
    }
    return;
  }

  const folderNames = allFolders.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
  const choice = prompt(`Select Folder Number to add track:\n${folderNames}`);
  const index = parseInt(choice, 10) - 1;

  if (!isNaN(index) && allFolders[index]) {
    const targetFolder = allFolders[index];
    try {
      const res = await fetch(`/api/folders/${targetFolder.id}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, userId: currentUser.id })
      });
      if (res.ok) {
        alert(`Track added to folder "${targetFolder.name}"!`);
        await loadAppData();
      }
    } catch (e) {
      console.error('Add song to folder error:', e);
    }
  }
}

async function removeTrackFromFolder(folderId, songId) {
  try {
    const res = await fetch(`/api/folders/${folderId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId, userId: currentUser.id })
    });
    if (res.ok) {
      await loadAppData();
      navigateTo('folder', { id: folderId });
    }
  } catch (e) {
    console.error('Remove track from folder error:', e);
  }
}

// --- UPLOAD TRACK MODAL (ISOLATED BY USER ID) ---
function openUploadModal() {
  const modal = document.getElementById('upload-modal');
  if (modal) modal.classList.add('open');
}

function closeUploadModal() {
  const modal = document.getElementById('upload-modal');
  if (modal) modal.classList.remove('open');
}

async function handleTrackUpload(event) {
  event.preventDefault();
  const formData = new FormData();

  formData.append('title', document.getElementById('upload-title').value);
  formData.append('artist', document.getElementById('upload-artist').value);
  formData.append('userId', currentUser.id);
  formData.append('album', document.getElementById('upload-album').value);
  formData.append('genre', document.getElementById('upload-genre').value);
  formData.append('lyrics', document.getElementById('upload-lyrics').value);

  const audioFile = document.getElementById('upload-audio').files[0];
  const coverFile = document.getElementById('upload-cover').files[0];

  if (audioFile) formData.append('audio', audioFile);
  if (coverFile) formData.append('cover', coverFile);

  try {
    const res = await fetch('/api/songs/upload', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      alert('Track uploaded and published successfully to your account!');
      closeUploadModal();
      document.getElementById('upload-form').reset();
      await loadAppData();
      navigateTo('home');
    } else {
      const err = await res.json();
      alert('Upload failed: ' + (err.error || 'Server error'));
    }
  } catch (e) {
    console.error('Track upload error:', e);
  }
}

// --- SYNCED LYRICS OVERLAY ---
function toggleLyricsModal() {
  const overlay = document.getElementById('lyrics-overlay');
  if (!overlay) return;

  const isOpen = overlay.classList.contains('open');
  if (isOpen) {
    overlay.classList.remove('open');
  } else {
    overlay.classList.add('open');
    renderLyricsContent();
  }
}

function renderLyricsContent() {
  const track = window.audioEngine ? window.audioEngine.currentTrack : null;
  const titleEl = document.getElementById('lyrics-track-title');
  const artistEl = document.getElementById('lyrics-track-artist');
  const coverEl = document.getElementById('lyrics-track-cover');
  const container = document.getElementById('lyrics-lines-wrap');

  if (!track) {
    if (container) container.innerHTML = `<div class="lyric-line active">Play a track to view lyrics</div>`;
    return;
  }

  if (titleEl) titleEl.textContent = track.title;
  if (artistEl) artistEl.textContent = track.artist;
  if (coverEl) coverEl.src = track.coverUrl;

  const rawLyrics = track.lyrics || `[00:02.00] ${track.title} by ${track.artist}\n[00:12.00] Streaming Real Audio Ad-Free on Harmonix`;
  const lines = rawLyrics.split('\n');

  let html = '';
  lines.forEach(line => {
    const text = line.replace(/\[\d{2}:\d{2}\.\d{2}\]/, '').trim();
    if (text) {
      html += `<div class="lyric-line">${escapeHtml(text)}</div>`;
    }
  });

  if (container) container.innerHTML = html;
}

function updateLyricsSync(currentTime) {}

// --- AUTH MODAL ---
let authMode = 'login';

function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('open');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('open');
}

function toggleAuthMode() {
  authMode = authMode === 'login' ? 'register' : 'login';
  const title = document.getElementById('auth-modal-title');
  const usernameWrap = document.getElementById('auth-username-wrap');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleText = document.getElementById('auth-toggle-text');

  if (authMode === 'register') {
    if (title) title.textContent = 'Create Harmonix Account';
    if (usernameWrap) usernameWrap.style.display = 'flex';
    if (submitBtn) submitBtn.textContent = 'Sign Up';
    if (toggleText) toggleText.textContent = 'Already have an account? Login';
  } else {
    if (title) title.textContent = 'User Login';
    if (usernameWrap) usernameWrap.style.display = 'none';
    if (submitBtn) submitBtn.textContent = 'Login to Account';
    if (toggleText) toggleText.textContent = "Don't have an account? Sign Up";
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const username = document.getElementById('auth-username').value;

  const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
  const body = authMode === 'register' ? { email, password, username } : { email, password };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      localStorage.setItem('harmonix_user', JSON.stringify(currentUser));
      updateUserUI();

      closeAuthModal();
      await loadAppData();
      navigateTo('home');
      alert(`Logged in successfully as ${currentUser.username}!`);
    } else {
      const err = await res.json();
      alert('Auth failed: ' + (err.error || 'Invalid credentials'));
    }
  } catch (e) {
    console.error('Auth submit error:', e);
  }
}

// Utility Helpers
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
