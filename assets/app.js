(() => {
  "use strict";

  document.body.classList.add("locked");

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const welcome = $("#welcome");
  const siteShell = $("#site-shell");
  const enterButton = $("#enter-site");
  const toast = $("#toast");
  let toastTimeout;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  enterButton.addEventListener("click", () => {
    document.body.classList.remove("locked");
    welcome.classList.add("is-leaving");
    siteShell.classList.add("is-visible");
    setTimeout(() => welcome.remove(), 1100);
    burstConfetti(32);
  });

  // A quiet, original ambient melody generated locally by the browser.
  let audioContext = null;
  let masterGain = null;
  let melodyTimer = null;
  let melodyStep = 0;
  let fileAudio = null;
  let fileAudioUrl = null;
  let musicIsPlaying = false;
  let progressTimer = null;
  let fakeProgress = 0;

  const chords = [
    [261.63, 329.63, 392.00, 523.25],
    [220.00, 261.63, 329.63, 440.00],
    [174.61, 220.00, 261.63, 349.23],
    [196.00, 246.94, 293.66, 392.00]
  ];

  function ensureAudioContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      showToast("Browser ini belum mendukung pemutar melodi. Coba unggah lagu sendiri.");
      return false;
    }
    if (!audioContext) {
      audioContext = new AudioCtx();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.0001;
      masterGain.connect(audioContext.destination);
    }
    if (audioContext.state === "suspended") audioContext.resume();
    return true;
  }

  function playChord() {
    if (!audioContext || !masterGain || !musicIsPlaying) return;
    const now = audioContext.currentTime;
    const chord = chords[melodyStep % chords.length];
    chord.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const noteGain = audioContext.createGain();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.exponentialRampToValueAtTime(index === 0 ? 0.045 : 0.018, now + 0.34 + index * 0.06);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.7);
      oscillator.connect(noteGain);
      noteGain.connect(masterGain);
      oscillator.start(now + index * 0.16);
      oscillator.stop(now + 2.85);
    });
    melodyStep += 1;
  }

  function startSynth() {
    if (!ensureAudioContext()) return false;
    musicIsPlaying = true;
    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setTargetAtTime(0.72, audioContext.currentTime, 0.45);
    playChord();
    clearInterval(melodyTimer);
    melodyTimer = setInterval(playChord, 2700);
    $("#track-title").textContent = "A Little Piece of Love";
    $("#track-status").textContent = "Original ambient melody · generated in your browser";
    $("#music-play-inline").textContent = "Ⅱ";
    updateMusicUI();
    startProgress();
    return true;
  }

  function stopSynth() {
    clearInterval(melodyTimer);
    melodyTimer = null;
    if (audioContext && masterGain) {
      masterGain.gain.cancelScheduledValues(audioContext.currentTime);
      masterGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.18);
    }
  }

  function startProgress() {
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      if (!musicIsPlaying) return;
      if (fileAudio && Number.isFinite(fileAudio.duration) && fileAudio.duration > 0) {
        const progress = (fileAudio.currentTime / fileAudio.duration) * 100;
        $("#track-progress").style.width = progress + "%";
      } else {
        fakeProgress = (fakeProgress + 0.28) % 100;
        $("#track-progress").style.width = fakeProgress + "%";
      }
    }, 350);
  }

  function updateMusicUI() {
    const toggle = $("#music-toggle");
    toggle.classList.toggle("is-playing", musicIsPlaying);
    toggle.setAttribute("aria-pressed", String(musicIsPlaying));
    toggle.setAttribute("aria-label", musicIsPlaying ? "Jeda musik" : "Putar musik");
    $("#music-label").textContent = musicIsPlaying ? "Music playing" : "Play music";
    $("#music-play-inline").textContent = musicIsPlaying ? "Ⅱ" : "▶";
    $(".music-card").classList.toggle("is-playing", musicIsPlaying);
  }

  async function toggleMusic() {
    if (musicIsPlaying) {
      musicIsPlaying = false;
      if (fileAudio) fileAudio.pause();
      stopSynth();
      clearInterval(progressTimer);
      updateMusicUI();
      return;
    }
    if (fileAudio) {
      try {
        await fileAudio.play();
        musicIsPlaying = true;
        updateMusicUI();
        startProgress();
      } catch (error) {
        showToast("Musik belum bisa diputar. Coba tekan tombol sekali lagi.");
      }
      return;
    }
    startSynth();
  }

  $("#music-toggle").addEventListener("click", toggleMusic);
  $("#music-play-inline").addEventListener("click", toggleMusic);

  $("#audio-upload").addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      showToast("Pilih file musik dengan format audio.");
      return;
    }
    if (fileAudioUrl) URL.revokeObjectURL(fileAudioUrl);
    if (fileAudio) fileAudio.pause();
    musicIsPlaying = false;
    stopSynth();
    clearInterval(progressTimer);
    fileAudioUrl = URL.createObjectURL(file);
    fileAudio = new Audio(fileAudioUrl);
    fileAudio.loop = true;
    $("#track-title").textContent = file.name.replace(/\.[^.]+$/, "").slice(0, 42);
    $("#track-status").textContent = "Lagu pilihanmu · tersimpan sementara di perangkat ini";
    $("#track-progress").style.width = "0%";
    fakeProgress = 0;
    updateMusicUI();
    showToast("Lagu siap diputar. Tekan tombol play untuk mendengarkan.");
    event.target.value = "";
  });

  // Gallery uploads are local-only: images are never sent to a server.
  const galleryGrid = $("#gallery-grid");
  const lightbox = $("#lightbox");
  const lightboxImage = $("#lightbox-image");

  function openLightbox(src, alt) {
    lightboxImage.src = src;
    lightboxImage.alt = alt || "Foto kenangan";
    lightbox.classList.add("is-open");
    document.body.classList.add("locked");
  }
  function closeLightbox() {
    lightbox.classList.remove("is-open");
    document.body.classList.remove("locked");
    lightboxImage.removeAttribute("src");
  }

  galleryGrid.addEventListener("click", (event) => {
    const item = event.target.closest(".gallery-item");
    if (!item) return;
    const image = $("img", item);
    openLightbox(item.dataset.full || image.src, image.alt);
  });
  $("#lightbox-close").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });

  $("#photo-upload").addEventListener("change", (event) => {
    const files = [...(event.target.files || [])].filter(file => file.type.startsWith("image/"));
    if (!files.length) return;
    const currentUploads = $$(".user-gallery-item", galleryGrid).length;
    const allowed = files.slice(0, Math.max(0, 8 - currentUploads));
    allowed.forEach((file) => {
      const url = URL.createObjectURL(file);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gallery-item user-gallery-item";
      button.setAttribute("aria-label", "Lihat foto yang ditambahkan");
      button.dataset.full = url;
      const image = document.createElement("img");
      image.src = url;
      image.alt = file.name || "Foto kenangan pilihanmu";
      image.loading = "lazy";
      const label = document.createElement("span");
      label.className = "gallery-overlay";
      label.innerHTML = '<span>YOUR SPECIAL MEMORY</span><b>↗</b>';
      button.append(image, label);
      galleryGrid.insertBefore(button, $(".gallery-upload-hint", galleryGrid));
    });
    if (files.length > allowed.length) showToast("Galeri lokal dibatasi hingga 8 foto tambahan.");
    else showToast(allowed.length + " foto berhasil ditambahkan ke galeri.");
    event.target.value = "";
  });

  // Petal Garden: a short tap game built for touchscreens and mouse users.
  const garden = $("#garden-playfield");
  const gardenMessage = $("#garden-message");
  const gardenStart = $("#garden-start");
  const flowerScore = $("#flower-score");
  const flowerTime = $("#flower-time");
  const gardenResult = $("#garden-result");
  let gardenActive = false;
  let gardenPoints = 0;
  let gardenSeconds = 30;
  let gardenClock = null;
  let gardenSpawner = null;
  let gardenSpawnCount = 0;

  function clearGardenTargets() {
    $$(".garden-target", garden).forEach(target => target.remove());
  }

  function endGarden(won) {
    gardenActive = false;
    clearInterval(gardenClock);
    clearInterval(gardenSpawner);
    clearGardenTargets();
    gardenMessage.hidden = false;
    gardenMessage.innerHTML = won
      ? "Taman ini mekar karena kamu!<br><strong>Pesan rahasia berhasil dibuka ♡</strong>"
      : "Bunga-bunganya tetap cantik.<br><strong>Coba lagi, masih ada waktu untuk tersenyum.</strong>";
    gardenResult.textContent = won
      ? "Kamu berhasil! Bunda, semoga hari-harimu selalu bermekaran seperti taman ini."
      : "Hampir! Yuk, coba sekali lagi.";
    gardenStart.textContent = won ? "Main lagi ↻" : "Coba lagi ↻";
    if (won) burstConfetti(48);
  }

  function spawnPetal() {
    if (!gardenActive || $$(".garden-target", garden).length >= 5) return;
    const target = document.createElement("button");
    target.className = "garden-target";
    target.type = "button";
    target.textContent = ["✿", "❀", "✾", "✧"][Math.floor(Math.random() * 4)];
    target.setAttribute("aria-label", "Ambil kelopak bunga");
    const maxX = Math.max(0, garden.clientWidth - 48);
    const maxY = Math.max(0, garden.clientHeight - 60);
    target.style.left = (8 + Math.random() * Math.max(0, maxX - 8)) + "px";
    target.style.top = (8 + Math.random() * Math.max(0, maxY - 8)) + "px";
    target.addEventListener("click", () => {
      if (!gardenActive) return;
      target.remove();
      gardenPoints += 1;
      flowerScore.textContent = gardenPoints + " / 12";
      if (gardenPoints >= 12) endGarden(true);
      else spawnPetal();
    });
    garden.appendChild(target);
    gardenSpawnCount += 1;
  }

  gardenStart.addEventListener("click", () => {
    clearInterval(gardenClock);
    clearInterval(gardenSpawner);
    clearGardenTargets();
    gardenActive = true;
    gardenPoints = 0;
    gardenSeconds = 30;
    gardenSpawnCount = 0;
    flowerScore.textContent = "0 / 12";
    flowerTime.textContent = "30s";
    gardenResult.textContent = "";
    gardenMessage.hidden = true;
    gardenStart.textContent = "Sedang bermain…";
    for (let i = 0; i < 3; i++) spawnPetal();
    gardenSpawner = setInterval(spawnPetal, 650);
    gardenClock = setInterval(() => {
      gardenSeconds -= 1;
      flowerTime.textContent = gardenSeconds + "s";
      if (gardenSeconds <= 0) endGarden(false);
    }, 1000);
  });

  // Find the Love: four pairs, shuffled on every round.
  const symbols = ["🌷", "♡", "✦", "🎁", "🌷", "♡", "✦", "🎁"];
  let memoryFirst = null;
  let memorySecond = null;
  let memoryLock = false;
  let memoryMatches = 0;
  let memoryMoves = 0;
  let memoryDeck = [];

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function updateMemoryStats() {
    $("#match-count").textContent = memoryMatches + " / 4";
    $("#move-count").textContent = String(memoryMoves);
  }

  function createMemoryGame() {
    const board = $("#memory-board");
    board.innerHTML = "";
    memoryDeck = shuffle(symbols);
    memoryFirst = null;
    memorySecond = null;
    memoryLock = false;
    memoryMatches = 0;
    memoryMoves = 0;
    $("#memory-result").textContent = "";
    updateMemoryStats();

    memoryDeck.forEach((symbol, index) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "memory-tile";
      tile.dataset.index = String(index);
      tile.setAttribute("aria-label", "Kartu tertutup");
      tile.addEventListener("click", () => flipMemoryTile(tile, symbol));
      board.appendChild(tile);
    });
  }

  function flipMemoryTile(tile, symbol) {
    if (memoryLock || tile.classList.contains("is-open") || tile.classList.contains("is-matched")) return;
    tile.classList.add("is-open");
    tile.textContent = symbol;
    tile.setAttribute("aria-label", "Kartu " + symbol);
    if (!memoryFirst) {
      memoryFirst = tile;
      return;
    }
    memorySecond = tile;
    memoryMoves += 1;
    updateMemoryStats();
    if (memoryFirst.textContent === memorySecond.textContent) {
      memoryFirst.classList.add("is-matched");
      memorySecond.classList.add("is-matched");
      memoryFirst = null;
      memorySecond = null;
      memoryMatches += 1;
      updateMemoryStats();
      if (memoryMatches === 4) {
        $("#memory-result").textContent = "Semua pasangan ditemukan! Satu pelukan virtual untuk Bunda. ♡";
        burstConfetti(36);
      }
    } else {
      memoryLock = true;
      setTimeout(() => {
        [memoryFirst, memorySecond].forEach(card => {
          card.classList.remove("is-open");
          card.textContent = "";
          card.setAttribute("aria-label", "Kartu tertutup");
        });
        memoryFirst = null;
        memorySecond = null;
        memoryLock = false;
      }, 760);
    }
  }

  $("#memory-reset").addEventListener("click", createMemoryGame);
  createMemoryGame();

  // A small rotating collection of wishes.
  const wishes = [
    "Semoga kesehatan selalu memeluk Bunda, dan kebahagiaan datang dari arah yang tak terduga.",
    "Semoga setiap lelah berganti menjadi ketenangan, dan setiap doa menemukan jalan terbaiknya.",
    "Semoga Bunda selalu dikelilingi orang-orang tulus yang menyayangi Bunda sepenuh hati.",
    "Semoga langkah Bunda ringan, hati Bunda lapang, dan hari-hari Bunda dipenuhi keberkahan.",
    "Semoga ada lebih banyak alasan untuk tertawa, lebih banyak waktu untuk beristirahat, dan lebih banyak cerita indah.",
    "Semoga semua hal baik yang pernah Bunda berikan kembali kepada Bunda berkali-kali lipat."
  ];
  let lastWish = -1;
  $("#wish-button").addEventListener("click", () => {
    let index = Math.floor(Math.random() * wishes.length);
    if (wishes.length > 1 && index === lastWish) index = (index + 1) % wishes.length;
    lastWish = index;
    const result = $("#wish-result");
    result.style.opacity = "0";
    setTimeout(() => {
      result.textContent = wishes[index];
      result.style.opacity = "1";
    }, 180);
    burstConfetti(12);
  });

  $("#hero-surprise").addEventListener("click", () => {
    burstConfetti(26);
    $("#letter").scrollIntoView({ behavior: "smooth" });
    showToast("Kejutan kecil sudah menunggumu di bagian surat. ♡");
  });
  $("#letter-more").addEventListener("click", () => {
    $("#letter-body").scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Simpan surat kecil ini sebagai pengingat rasa sayang. ♡");
  });
  $("#celebrate-button").addEventListener("click", () => {
    burstConfetti(90);
    showToast("Selamat ulang tahun, Bunda! Semoga selalu bahagia. ♡");
    if (!musicIsPlaying) toggleMusic();
  });

  function burstConfetti(amount = 40) {
    const layer = $("#confetti-layer");
    const symbols = ["✦", "✿", "♡", "·", "✧"];
    const colors = ["#d9b987", "#c6818c", "#f3ded0", "#b7a1b4", "#f7e9ca"];
    for (let i = 0; i < amount; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      piece.style.left = Math.random() * 100 + "%";
      piece.style.color = colors[Math.floor(Math.random() * colors.length)];
      piece.style.fontSize = (9 + Math.random() * 15) + "px";
      piece.style.setProperty("--fall", (2.6 + Math.random() * 2.2) + "s");
      piece.style.setProperty("--drift", ((Math.random() - 0.5) * 220) + "px");
      piece.style.animationDelay = (Math.random() * 0.5) + "s";
      layer.appendChild(piece);
      setTimeout(() => piece.remove(), 5500);
    }
  }

  // A very subtle star field, with no external animation library.
  const canvas = $("#sparkle-canvas");
  const ctx = canvas.getContext("2d");
  let stars = [];
  let canvasWidth = 0;
  let canvasHeight = 0;
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = Math.floor(canvasWidth * dpr);
    canvas.height = Math.floor(canvasHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.min(42, Math.floor(canvasWidth / 13)) }, () => ({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      size: 0.5 + Math.random() * 1.3,
      phase: Math.random() * Math.PI * 2
    }));
  }
  function drawStars(time) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    stars.forEach(star => {
      const alpha = 0.12 + (Math.sin(time * 0.0007 + star.phase) + 1) * 0.2;
      ctx.fillStyle = "rgba(186, 139, 133, " + alpha + ")";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(drawStars);
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas, { passive: true });
  if (ctx) requestAnimationFrame(drawStars);

  // Clear temporary media resources when the page is closed.
  window.addEventListener("beforeunload", () => {
    if (fileAudio) fileAudio.pause();
    if (fileAudioUrl) URL.revokeObjectURL(fileAudioUrl);
  });
})();