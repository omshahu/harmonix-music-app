/* ==========================================================================
   HARMONIX AUDIO ENGINE & WEB AUDIO API SPECTRUM VISUALIZER
   (OPTIMIZED FOR MOBILE PHONES, DESKTOPS & BACKGROUND PLAYBACK)
   ========================================================================== */

class AudioEngine {
  constructor() {
    this.audio = new Audio();
    // Do NOT set crossOrigin = "anonymous" unconditionally as iOS Safari mutes audio on CORS mismatches
    this.currentTrack = null;
    this.queue = [];
    this.queueIndex = 0;

    this.isPlaying = false;
    this.isShuffle = false;
    this.repeatMode = 0; // 0 = off, 1 = repeat playlist, 2 = repeat track
    this.isMuted = false;
    this.previousVolume = 0.8;
    this.unlocked = false;

    // Web Audio API Context & Analyser Node for Visualizer Canvas
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.dataArray = null;
    this.visualizerCanvas = null;
    this.canvasCtx = null;

    this.setupListeners();
    this.setupMobileGestureUnlock();
  }

  setupListeners() {
    this.audio.addEventListener('timeupdate', () => {
      this.onTimeUpdate();
    });

    this.audio.addEventListener('ended', () => {
      this.onTrackEnded();
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.updatePlayPauseUI();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayPauseUI();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio playback error event:', e);
      this.isPlaying = false;
      this.updatePlayPauseUI();
    });
  }

  setupMobileGestureUnlock() {
    const unlockHandler = () => {
      this.unlockAudioContext();
      window.removeEventListener('touchstart', unlockHandler);
      window.removeEventListener('click', unlockHandler);
      window.removeEventListener('pointerdown', unlockHandler);
    };

    window.addEventListener('touchstart', unlockHandler, { passive: true });
    window.addEventListener('click', unlockHandler, { passive: true });
    window.addEventListener('pointerdown', unlockHandler, { passive: true });
  }

  unlockAudioContext() {
    if (this.unlocked) return;
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.unlocked = true;
    } catch (e) {
      console.warn('AudioContext unlock notice:', e);
    }
  }

  initVisualizer() {
    // Only initialize visualizer on larger screens where visualizer canvas is visible
    if (window.innerWidth <= 840) return;
    if (this.audioCtx && this.source) return;
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.audioCtx = new AudioCtx();
      }

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;

      // Enable crossOrigin safely for Web Audio node connection if supported
      this.audio.crossOrigin = "anonymous";
      this.source = this.audioCtx.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.visualizerCanvas = document.getElementById('visualizer-canvas');
      if (this.visualizerCanvas) {
        this.canvasCtx = this.visualizerCanvas.getContext('2d');
        this.drawSpectrum();
      }
    } catch (e) {
      console.warn('Spectrum visualizer fallback:', e.message);
    }
  }

  drawSpectrum() {
    if (!this.analyser || !this.canvasCtx || !this.visualizerCanvas) return;

    requestAnimationFrame(() => this.drawSpectrum());

    const width = this.visualizerCanvas.width;
    const height = this.visualizerCanvas.height;

    this.analyser.getByteFrequencyData(this.dataArray);
    this.canvasCtx.clearRect(0, 0, width, height);

    const barWidth = (width / this.dataArray.length) * 1.8;
    let x = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      const barHeight = (this.dataArray[i] / 255) * height;

      const gradient = this.canvasCtx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#1DB954');
      gradient.addColorStop(1, '#10B981');

      this.canvasCtx.fillStyle = this.isPlaying ? gradient : 'rgba(255, 255, 255, 0.15)';
      this.canvasCtx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

      x += barWidth + 1;
    }
  }

  playTrack(track, queue = null) {
    if (!track) return;

    this.unlockAudioContext();

    if (queue && queue.length > 0) {
      this.queue = queue;
      this.queueIndex = this.queue.findIndex(t => t.id === track.id);
      if (this.queueIndex === -1) {
        this.queue.unshift(track);
        this.queueIndex = 0;
      }
    } else if (!this.queue.some(t => t.id === track.id)) {
      this.queue = [track];
      this.queueIndex = 0;
    }

    this.currentTrack = track;
    let streamUrl = track.audioUrl || `/api/songs/stream/${track.id}`;
    if (streamUrl.startsWith('/')) {
      streamUrl = window.location.origin + streamUrl;
    }

    this.audio.src = streamUrl;
    this.audio.load();

    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.isPlaying = true;
        this.updatePlayPauseUI();
        this.updateMediaSession(track);
        this.initVisualizer();
      }).catch(e => {
        console.warn('Audio play promise blocked:', e);
        this.isPlaying = false;
        this.updatePlayPauseUI();
      });
    }

    this.updatePlayerUI();
  }

  togglePlayPause() {
    this.unlockAudioContext();

    if (!this.currentTrack) {
      if (this.queue.length > 0) {
        this.playTrack(this.queue[0], this.queue);
      } else if (window.allSongs && window.allSongs.length > 0) {
        this.playTrack(window.allSongs[0], window.allSongs);
      }
      return;
    }

    if (this.isPlaying) {
      this.audio.pause();
    } else {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.audio.play().catch(e => console.warn('Play interrupted:', e));
    }
  }

  nextTrack() {
    if (this.queue.length === 0) return;

    if (this.isShuffle) {
      this.queueIndex = Math.floor(Math.random() * this.queue.length);
    } else {
      this.queueIndex = (this.queueIndex + 1) % this.queue.length;
    }

    const next = this.queue[this.queueIndex];
    if (next) this.playTrack(next, this.queue);
  }

  prevTrack() {
    if (this.queue.length === 0) return;

    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    this.queueIndex = (this.queueIndex - 1 + this.queue.length) % this.queue.length;
    const prev = this.queue[this.queueIndex];
    if (prev) this.playTrack(prev, this.queue);
  }

  onTrackEnded() {
    if (this.repeatMode === 2) {
      this.audio.currentTime = 0;
      this.audio.play().catch(e => console.warn('Repeat play error:', e));
    } else if (this.repeatMode === 1 || this.queueIndex < this.queue.length - 1 || this.isShuffle) {
      this.nextTrack();
    } else {
      this.isPlaying = false;
      this.updatePlayPauseUI();
    }
  }

  seekTo(percent) {
    if (!this.audio.duration) return;
    this.audio.currentTime = (percent / 100) * this.audio.duration;
  }

  setVolume(val) {
    this.audio.volume = parseFloat(val);
    this.isMuted = this.audio.volume === 0;
    this.updateVolumeUI();
  }

  toggleMute() {
    if (this.isMuted) {
      this.audio.volume = this.previousVolume || 0.8;
      this.isMuted = false;
    } else {
      this.previousVolume = this.audio.volume;
      this.audio.volume = 0;
      this.isMuted = true;
    }
    this.updateVolumeUI();
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    document.querySelectorAll('.btn-shuffle-toggle').forEach(btn => {
      btn.classList.toggle('active', this.isShuffle);
    });
    const btn = document.getElementById('btn-shuffle');
    if (btn) btn.classList.toggle('active', this.isShuffle);
  }

  toggleRepeat() {
    this.repeatMode = (this.repeatMode + 1) % 3;
    const btns = document.querySelectorAll('.btn-repeat-toggle');
    btns.forEach(btn => {
      btn.classList.toggle('active', this.repeatMode > 0);
      btn.setAttribute('title', this.repeatMode === 2 ? 'Repeat Track' : (this.repeatMode === 1 ? 'Repeat Playlist' : 'Repeat Off'));
    });
    const btn = document.getElementById('btn-repeat');
    if (btn) {
      btn.classList.toggle('active', this.repeatMode > 0);
    }
  }

  onTimeUpdate() {
    const currTime = this.audio.currentTime || 0;
    const duration = this.audio.duration || 0;

    const currEl = document.getElementById('curr-time');
    const totalEl = document.getElementById('total-time');
    const seekBar = document.getElementById('seek-bar');

    // Mobile player modal elements
    const mobCurrEl = document.getElementById('mob-curr-time');
    const mobTotalEl = document.getElementById('mob-total-time');
    const mobSeekBar = document.getElementById('mob-seek-bar');

    const formattedCurr = this.formatTime(currTime);
    const formattedTotal = this.formatTime(duration);
    const progressPercent = duration > 0 ? (currTime / duration) * 100 : 0;

    if (currEl) currEl.textContent = formattedCurr;
    if (totalEl) totalEl.textContent = formattedTotal;
    if (seekBar && duration > 0) seekBar.value = progressPercent;

    if (mobCurrEl) mobCurrEl.textContent = formattedCurr;
    if (mobTotalEl) mobTotalEl.textContent = formattedTotal;
    if (mobSeekBar && duration > 0) mobSeekBar.value = progressPercent;

    if (window.updateLyricsSync) {
      window.updateLyricsSync(currTime);
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  updatePlayerUI() {
    if (!this.currentTrack) return;

    const cover = document.getElementById('np-cover');
    const title = document.getElementById('np-title');
    const artist = document.getElementById('np-artist');

    // Mobile player overlay UI elements
    const mobCover = document.getElementById('mob-np-cover');
    const mobTitle = document.getElementById('mob-np-title');
    const mobArtist = document.getElementById('mob-np-artist');

    if (cover) cover.src = this.currentTrack.coverUrl;
    if (title) title.textContent = this.currentTrack.title;
    if (artist) artist.textContent = this.currentTrack.artist;

    if (mobCover) mobCover.src = this.currentTrack.coverUrl;
    if (mobTitle) mobTitle.textContent = this.currentTrack.title;
    if (mobArtist) mobArtist.textContent = this.currentTrack.artist;

    if (window.updateCurrentTrackLikeState) {
      window.updateCurrentTrackLikeState(this.currentTrack.id);
    }
  }

  updatePlayPauseUI() {
    const playPauseBtns = document.querySelectorAll('.btn-play-pause, #mob-btn-play-pause');
    playPauseBtns.forEach(btn => {
      btn.innerHTML = this.isPlaying ? `<i data-lucide="pause"></i>` : `<i data-lucide="play"></i>`;
    });
    if (window.lucide) lucide.createIcons();
  }

  updateVolumeUI() {
    const volBar = document.getElementById('volume-bar');
    const muteBtn = document.getElementById('btn-mute');

    if (volBar) volBar.value = this.audio.volume;
    if (muteBtn) {
      const icon = this.isMuted || this.audio.volume === 0 ? 'volume-x' : (this.audio.volume < 0.5 ? 'volume-1' : 'volume-2');
      muteBtn.innerHTML = `<i data-lucide="${icon}"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  updateMediaSession(track) {
    if ('mediaSession' in navigator && track) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title || 'Harmonix Music',
          artist: track.artist || 'Harmonix',
          album: track.album || 'Ad-Free Real Audio',
          artwork: [
            { src: track.coverUrl || '', sizes: '512x512', type: 'image/jpeg' }
          ]
        });

        navigator.mediaSession.setActionHandler('play', () => this.togglePlayPause());
        navigator.mediaSession.setActionHandler('pause', () => this.togglePlayPause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.prevTrack());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime && this.audio.duration) {
            this.audio.currentTime = details.seekTime;
          }
        });
      } catch (e) {
        console.warn('MediaSession notice:', e);
      }
    }
  }
}

// Global Audio Engine Instance
window.audioEngine = new AudioEngine();

// --- EXPOSE GLOBAL HANDLERS FOR HTML BUTTON EVENTS ---
window.togglePlayPause = function() {
  if (window.audioEngine) window.audioEngine.togglePlayPause();
};

window.prevTrack = function() {
  if (window.audioEngine) window.audioEngine.prevTrack();
};

window.nextTrack = function() {
  if (window.audioEngine) window.audioEngine.nextTrack();
};

window.toggleShuffle = function() {
  if (window.audioEngine) window.audioEngine.toggleShuffle();
};

window.toggleRepeat = function() {
  if (window.audioEngine) window.audioEngine.toggleRepeat();
};

window.toggleMute = function() {
  if (window.audioEngine) window.audioEngine.toggleMute();
};

window.handleSeek = function(val) {
  if (window.audioEngine) window.audioEngine.seekTo(val);
};

window.handleVolume = function(val) {
  if (window.audioEngine) window.audioEngine.setVolume(val);
};

window.openMobilePlayerModal = function() {
  const modal = document.getElementById('mobile-player-modal');
  if (modal) modal.classList.add('open');
};

window.closeMobilePlayerModal = function() {
  const modal = document.getElementById('mobile-player-modal');
  if (modal) modal.classList.remove('open');
};
