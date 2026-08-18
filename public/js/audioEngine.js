/* ==========================================================================
   HARMONIX AUDIO ENGINE & WEB AUDIO API SPECTRUM VISUALIZER
   ========================================================================== */

class AudioEngine {
  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = "anonymous";

    this.currentTrack = null;
    this.queue = [];
    this.queueIndex = 0;

    this.isPlaying = false;
    this.isShuffle = false;
    this.repeatMode = 0; // 0 = off, 1 = repeat playlist, 2 = repeat track
    this.isMuted = false;
    this.previousVolume = 0.8;

    // Web Audio API Context & Analyser Node for Visualizer Canvas
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.dataArray = null;
    this.visualizerCanvas = null;
    this.canvasCtx = null;

    this.setupListeners();
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
  }

  initVisualizer() {
    if (this.audioCtx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;

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
      console.warn('Web Audio API spectrum visualizer notice:', e.message);
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

    if (!this.audioCtx) {
      this.initVisualizer();
    } else if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

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
    this.audio.src = track.audioUrl || `/api/songs/stream/${track.id}`;
    this.audio.load();
    this.audio.play().catch(e => console.log('Audio play interrupted:', e));

    this.updatePlayerUI();
  }

  togglePlayPause() {
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
      this.audio.play();
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
      this.audio.play();
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
    const btn = document.getElementById('btn-shuffle');
    if (btn) {
      btn.classList.toggle('active', this.isShuffle);
    }
  }

  toggleRepeat() {
    this.repeatMode = (this.repeatMode + 1) % 3;
    const btn = document.getElementById('btn-repeat');
    if (btn) {
      btn.classList.toggle('active', this.repeatMode > 0);
      if (this.repeatMode === 2) {
        btn.setAttribute('title', 'Repeat Track');
      } else if (this.repeatMode === 1) {
        btn.setAttribute('title', 'Repeat Playlist');
      } else {
        btn.setAttribute('title', 'Repeat Off');
      }
    }
  }

  onTimeUpdate() {
    const currTime = this.audio.currentTime || 0;
    const duration = this.audio.duration || 0;

    const currEl = document.getElementById('curr-time');
    const totalEl = document.getElementById('total-time');
    const seekBar = document.getElementById('seek-bar');

    if (currEl) currEl.textContent = this.formatTime(currTime);
    if (totalEl) totalEl.textContent = this.formatTime(duration);
    if (seekBar && duration > 0) {
      seekBar.value = (currTime / duration) * 100;
    }

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

    if (cover) cover.src = this.currentTrack.coverUrl;
    if (title) title.textContent = this.currentTrack.title;
    if (artist) artist.textContent = this.currentTrack.artist;

    if (window.updateCurrentTrackLikeState) {
      window.updateCurrentTrackLikeState(this.currentTrack.id);
    }
  }

  updatePlayPauseUI() {
    const btn = document.getElementById('btn-play-pause');
    if (btn) {
      btn.innerHTML = this.isPlaying ? `<i data-lucide="pause"></i>` : `<i data-lucide="play"></i>`;
      if (window.lucide) lucide.createIcons();
    }
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
