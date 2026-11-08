// Shared engine for the radio pages. Each page sets window.RADIO (labels, FM band,
// now-playing source) and window.STATIONS (written by its resolver script), then loads this.
(() => {
  const C = window.RADIO, L = C.labels;
  const STATIONS = window.STATIONS || [];
  const $ = id => document.getElementById(id);

  /* ---------- Markup ---------- */
  const knobInner = '<div class="rot"><div class="grip"></div><div class="cap"></div><div class="dot"></div></div>';
  document.body.insertAdjacentHTML("afterbegin", `
<div class="receiver off" id="rx">
  <div class="cheek left"></div>
  <div class="face">
    <header class="top">
      <div class="brand"><span class="mark">${L.mark}</span><span class="name">${L.brand}</span></div>
      <div class="model"><span class="label">${L.subtitle} &nbsp;</span><b>${L.model}</b></div>
    </header>

    <div class="dial" id="dial">
      <div class="scale fm" id="fmScale"><span class="unit">FM</span></div>
      <div class="scale am" id="amScale"><span class="unit">AM</span></div>
      <div class="needle" id="needle" style="left:4%"></div>
      <div class="dial-tag native">${L.dialTag}</div>
    </div>

    <div class="main">
      <section class="presets" aria-label="${L.ariaPresets}">
        <div class="presets-head"><span class="label">${L.memory}</span><span class="led green" id="memLed"></span></div>
        <div id="presetList" style="display:contents"></div>
      </section>

      <section class="vfd" aria-live="polite">
        <div class="push">${L.push}</div>
        <div class="freq-row lit-on">
          <span class="band">FM</span>
          <span class="freq glow" id="freq">--.-</span>
          <span class="mhz glow">MHz</span>
        </div>
        <div class="indicators lit-on">
          <span class="ind" id="indStereo">STEREO</span>
          <span class="ind" id="indTuned">${L.tuned}</span>
          <span class="ind amber" id="indScan">${L.scanning}</span>
          <span class="ind amber" id="indMute">${L.mute}</span>
        </div>
        <div class="station lit-on" id="stName">&nbsp;</div>
        <div class="line artist glow lit-on" id="artist"><span>&nbsp;</span></div>
        <div class="line title glow lit-on" id="title"><span>&nbsp;</span></div>
        <div class="art lit-on" id="art"><div class="ph glow" id="artPh"><div>♪<small>${L.noArt}</small></div></div><img id="artImg" alt=""></div>
        <div class="bottom-row lit-on">
          <div>
            <div class="progress glow"><span id="tPos">0:00</span><span class="bar"><i id="bar"></i></span><span id="tLen">0:00</span></div>
            <canvas class="spectrum" id="spec"></canvas>
          </div>
          <div class="signal glow"><span>SIGNAL</span><div class="ladder" id="ladder"></div></div>
        </div>
      </section>

      <section class="controls">
        <div class="btns">
          <div class="sq"><span class="led" id="ledDown"></span><button class="key" id="btnDown" aria-label="${L.ariaDown}">${L.down}</button></div>
          <div class="sq"><span class="led" id="ledScan"></span><button class="key" id="btnScan" aria-label="${L.ariaScan}">${L.scan}</button></div>
          <div class="sq"><span class="led" id="ledUp"></span><button class="key" id="btnUp" aria-label="${L.ariaUp}">${L.up}</button></div>
        </div>
        <div class="knob-wrap tune">
          <div class="knob big" id="tuneKnob" tabindex="0" role="slider" aria-label="${L.ariaTuning}">${knobInner}</div>
          <span class="label">${L.tuning}</span>
        </div>
      </section>
    </div>

    <footer class="bottom">
      <button class="power" id="btnPower" aria-label="${L.ariaPower}"><span class="key">${L.power}</span><span class="led" id="ledPower"></span><span class="label">${L.powerNote}</span></button>
      <div class="foot-mid">
        <span class="label wide">${L.phones}</span><span class="jack"></span>
        <span class="label wide" id="info" style="min-width:110px"></span>
      </div>
      <div class="knob-wrap" style="flex-direction:row;gap:12px">
        <span class="label">${L.volume}</span>
        <div class="vol-scale" id="volScale">
          <div class="knob small" id="volKnob" tabindex="0" role="slider" aria-label="${L.ariaVolume}" aria-valuemin="0" aria-valuemax="100">${knobInner}</div>
        </div>
      </div>
    </footer>
  </div>
  <div class="cheek right"></div>
</div>
<p class="hint">${L.keys}<br>${L.credit}</p>`);
  const rx = $("rx");

  // Stations are spread evenly across the country's FM band like dial presets.
  const { min: F_MIN, max: F_MAX, first: F_FIRST, last: F_LAST } = C.band;
  const freqFor = i => STATIONS.length < 2 ? (F_FIRST + F_LAST) / 2
    : +(F_FIRST + i * ((F_LAST - F_FIRST) / (STATIONS.length - 1))).toFixed(1);
  const pct = f => 4 + 92 * (f - F_MIN) / (F_MAX - F_MIN);

  // Pages share an origin (akirikku.github.io), so each keeps its settings under its own prefix.
  const store = {
    get(k, d) { try { const v = localStorage.getItem(C.id + "." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(C.id + "." + k, JSON.stringify(v)); } catch {} },
  };

  const state = {
    power: false,
    idx: Math.min(store.get("idx", 0), Math.max(0, STATIONS.length - 1)),
    vol: store.get("vol", 0.7),
    muted: false,
    scan: false,
    tuned: false,
    meta: null,
    nowByStation: {},
  };

  /* ---------- Build the dial ---------- */
  const fm = $("fmScale"), am = $("amScale");
  // A wide band has too many numbers for a phone; narrow screens then show every other one.
  const crowded = (F_MAX - F_MIN) / 2 + 1 > 8;
  for (let f = F_MIN; f <= F_MAX + 1e-6; f += 0.2) {
    const whole = Math.abs(f - Math.round(f)) < 1e-6;
    const t = document.createElement("i");
    t.className = "tick" + (whole ? " major" : "");
    t.style.left = (f - F_MIN) / (F_MAX - F_MIN) * 100 + "%";
    t.style.height = whole ? "12px" : "6px";
    fm.appendChild(t);
    if (whole && Math.round(f) % 2 === 0) {
      const n = document.createElement("span");
      n.className = "num" + (crowded && (Math.round(f) - F_MIN) % 4 ? " minor" : "");
      n.textContent = Math.round(f);
      n.style.left = t.style.left;
      fm.appendChild(n);
    }
  }
  [530, 600, 700, 800, 1000, 1200, 1400, 1600].forEach((k, i, a) => {
    const n = document.createElement("span");
    n.className = "num"; n.textContent = k;
    n.style.left = i / (a.length - 1) * 100 + "%";
    am.appendChild(n);
  });
  STATIONS.forEach((s, i) => {
    const m = document.createElement("button");
    m.className = "marker"; m.textContent = i + 1;
    m.title = s.name;
    m.style.left = pct(freqFor(i)) + "%";
    m.addEventListener("click", () => tune(i));
    $("dial").appendChild(m);
  });

  /* ---------- Presets ---------- */
  const presetEls = STATIONS.map((s, i) => {
    const b = document.createElement("button");
    b.className = "preset";
    b.innerHTML = `<span class="led"></span><span class="key">${i + 1}</span><span class="pname"></span>`;
    const name = document.createElement("span");
    name.textContent = s.name;
    const now = document.createElement("span");
    now.className = "pnow"; now.textContent = freqFor(i).toFixed(1) + " MHz";
    b.querySelector(".pname").append(name, now);
    b.addEventListener("click", () => tune(i));
    $("presetList").appendChild(b);
    return { b, led: b.querySelector(".led"), now };
  });

  /* ---------- Signal ladder ---------- */
  const LADDER = 8;
  const rungs = Array.from({ length: LADDER }, (_, i) => {
    const r = document.createElement("b");
    r.style.height = 5 + i * 3 + "px";
    $("ladder").appendChild(r);
    return r;
  });

  /* ---------- Volume scale ticks ---------- */
  for (let i = 0; i <= 10; i++) {
    const t = document.createElement("i");
    t.style.transform = `rotate(${-135 + i * 27}deg)`;
    $("volScale").appendChild(t);
  }

  /* ---------- Audio ---------- */
  // Both station sets send Access-Control-Allow-Origin: *, so the element can feed Web Audio
  // (real spectrum + level meter). Plain streams play directly; HLS (.m3u8) goes through
  // hls.js and Media Source Extensions, or natively in Safari. If CORS ever breaks on a
  // plain stream we fall back to an element outside Web Audio.
  let audio, ctx, master, analyser, noiseGain, hls, plain = false, everPlayed = false;
  let loadTimer, staticTimer;

  function makeAudio(withCors) {
    const a = new Audio();
    if (withCors) a.crossOrigin = "anonymous";
    a.preload = "none";
    a.addEventListener("playing", () => { everPlayed = true; setTuned(true); stopStatic(); });
    a.addEventListener("waiting", () => setTuned(false));
    a.addEventListener("error", onAudioError);
    return a;
  }
  audio = makeAudio(true);

  function ensureGraph() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.connect(ctx.destination);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.78;
      if (!plain) {
        const src = ctx.createMediaElementSource(audio);
        src.connect(analyser);
        analyser.connect(master);
      }
      // Tuning static: looped white noise through a band-pass, like between stations.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf; noise.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 2200; bp.Q.value = 0.5;
      noiseGain = ctx.createGain(); noiseGain.gain.value = 0;
      noise.connect(bp); bp.connect(noiseGain); noiseGain.connect(master);
      noise.start();
      applyVolume();
    } catch (e) {
      console.warn("Web Audio unavailable", e);
      ctx = null; plain = true;
    }
  }

  function onAudioError() {
    if (!state.power || !audio.getAttribute("src")) return;
    if (!plain && !everPlayed && !hls) {
      // Most likely a CORS problem: retry without Web Audio routing.
      console.warn("Stream failed with CORS; retrying in plain mode");
      plain = true;
      audio.removeAttribute("src");
      audio = makeAudio(false);
      applyVolume();
      loadStream();
      return;
    }
    retryStream();
  }
  function retryStream() {
    setTuned(false);
    clearTimeout(loadTimer);
    loadTimer = setTimeout(loadStream, 4000); // stream dropped; try again
  }

  function applyVolume() {
    const v = state.muted ? 0 : state.vol * state.vol; // perceptual curve
    if (master) master.gain.setTargetAtTime(plain ? (state.muted ? 0 : 1) : v, ctx.currentTime, 0.03);
    audio.volume = plain ? v : 1;
    $("indMute").classList.toggle("on", state.muted);
  }

  function startStatic() {
    if (!noiseGain) return;
    clearTimeout(staticTimer);
    noiseGain.gain.setTargetAtTime(0.16, ctx.currentTime, 0.02);
    staticTimer = setTimeout(stopStatic, 3000); // never hiss forever on a slow stream
  }
  function stopStatic() {
    if (!noiseGain) return;
    clearTimeout(staticTimer);
    noiseGain.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
  }

  function stopHls() {
    if (hls) { hls.destroy(); hls = null; }
  }

  // KBS hands out signed stream links that expire, so fetch a fresh one on every tune.
  async function streamUrl(s) {
    if (!s.kbs) return s.stream;
    const r = await fetch(`https://cfpwwwapi.kbs.co.kr/api/v1/landing/live/channel_code/${s.kbs}`, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    const items = (await r.json()).channel_item || [];
    return (items.find(c => c.media_type === "radio") || items[0])?.service_url;
  }

  let loadSeq = 0;
  async function loadStream() {
    if (!state.power) return;
    const seq = ++loadSeq, s = STATIONS[state.idx];
    stopHls();
    let url;
    try { url = await streamUrl(s); } catch (e) { console.warn("stream", s.name, e); }
    if (seq !== loadSeq || !state.power) return; // tuned elsewhere meanwhile
    if (!url) { retryStream(); return; }
    if (/\.m3u8(\?|$)/.test(url) && window.Hls && Hls.isSupported()) {
      hls = new Hls({ liveSyncDurationCount: 3 });
      hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) retryStream(); });
      hls.loadSource(url);
      hls.attachMedia(audio);
    } else if (/\.m3u8(\?|$)/.test(url)) {
      audio.src = url; // Safari plays HLS natively
    } else {
      audio.src = url + (url.includes("?") ? "&" : "?") + "nocache=" + Date.now();
    }
    audio.play().catch(err => {
      if (err.name === "NotAllowedError") setPower(false); // autoplay blocked: wait for a click
    });
  }

  function setTuned(on) {
    state.tuned = on;
    $("indTuned").classList.toggle("on", on && state.power);
    $("indStereo").classList.toggle("on", on && state.power);
  }

  /* ---------- Tuning ---------- */
  function tune(i, { fromScan = false } = {}) {
    if (!STATIONS.length) return;
    if (!fromScan && state.scan) setScan(false);
    state.idx = (i + STATIONS.length) % STATIONS.length;
    store.set("idx", state.idx);
    if (!state.power) { setPower(true); return; }
    renderStation();
    setTuned(false);
    ensureGraph();
    startStatic();
    // Debounce so spinning the knob doesn't open a connection per click.
    clearTimeout(loadTimer);
    loadTimer = setTimeout(loadStream, 280);
    refreshCurrent();
  }
  const step = d => tune(state.idx + d);

  function renderStation() {
    const s = STATIONS[state.idx];
    const f = freqFor(state.idx);
    $("needle").style.left = pct(f) + "%";
    $("freq").textContent = f.toFixed(1);
    $("stName").textContent = s.name;
    presetEls.forEach((p, i) => p.led.classList.toggle("lit", state.power && i === state.idx));
    document.querySelectorAll(".marker").forEach((m, i) => m.classList.toggle("active", i === state.idx));
    const cached = state.nowByStation[state.idx];
    showMeta(cached || null, true);
  }

  function setPower(on) {
    state.power = on;
    rx.classList.toggle("on", on);
    rx.classList.toggle("off", !on);
    $("ledPower").classList.toggle("lit", on);
    if (on) {
      ensureGraph();
      renderStation();
      startStatic();
      loadStream();
      refreshAll();
    } else {
      setScan(false);
      clearTimeout(loadTimer);
      stopStatic();
      stopHls();
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setTuned(false);
      presetEls.forEach(p => p.led.classList.remove("lit"));
      document.title = C.title;
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    }
  }

  // SCAN: hop to the next station every few seconds, like auto-tuning.
  let scanTimer;
  function setScan(on) {
    state.scan = on;
    $("ledScan").classList.toggle("lit", on);
    $("indScan").classList.toggle("on", on);
    clearInterval(scanTimer);
    if (on) {
      if (!state.power) setPower(true);
      scanTimer = setInterval(() => tune(state.idx + 1, { fromScan: true }), 10000);
    }
  }

  /* ---------- Now playing ---------- */
  // A source fetches song info for the given station indexes and resolves to
  // { [index]: { key, artist, title, art, ts, len, listeners?, noLookup? } }. ts is when the
  // song started (ms), or null when unknown; len is 0 when unknown. It may return more
  // stations than were asked for. Each station names its source, else the page's default.
  const sourceOf = i => STATIONS[i].source || C.source;
  const SOURCES = {
    // asia DREAM radio's station software: one history call per station.
    async asiadream(indexes) {
      const out = {};
      await Promise.all(indexes.map(async i => {
        const s = STATIONS[i];
        if (!s.api || s.serverId == null) return;
        try {
          const r = await fetch(`${s.api}/history/?limit=1&offset=0&server=${s.serverId}`, { cache: "no-store" });
          if (!r.ok) throw new Error(r.status);
          const t = (await r.json()).results?.[0];
          if (!t) { out[i] = null; return; }
          let artist = t.author, title = t.title;
          if ((!artist || !title) && t.metadata) [artist, title] = t.metadata.split(" - ").concat([""]);
          const art = t.img_medium_url || t.img_url;
          out[i] = {
            key: t.metadata || `${artist}|${title}`,
            artist: artist || "", title: title || "",
            art: art && !/default_track_img/.test(art) ? art : null,
            ts: t.ts, len: t.length, listeners: t.n_listeners,
          };
        } catch (e) { console.warn("metadata", s.name, e); }
      }));
      return out;
    },

    // İstanbul FM: the same call istanbulfm.com.tr makes returns every channel with its
    // current song. It answers CORS with *, and a form-encoded POST needs no preflight.
    async istanbulfm() {
      const r = await fetch("https://api.istanbulfm.com.tr/v1/Route/get?url=/radyolar", {
        method: "POST", cache: "no-store",
        body: "client=web&lang=tr&devicePlatform=1&deviceType=0&deviceID=127.0.0.1",
        headers: { "Content-type": "application/x-www-form-urlencoded" },
      });
      if (!r.ok) throw new Error(r.status);
      const channels = {};
      (function walk(o) {
        if (Array.isArray(o)) o.forEach(walk);
        else if (o && typeof o === "object") {
          if (o.appClass === "Channels" && o.timeline && !(o.ID in channels)) channels[o.ID] = o;
          Object.values(o).forEach(walk);
        }
      })((await r.json()).data);
      const out = {}, now = Date.now();
      STATIONS.forEach((s, i) => {
        const t = channels[s.channelId]?.timeline?.[0];
        if (!t) return;
        const key = `${t.songID}|${t.artistTitle}|${t.songTitle}`;
        const prev = state.nowByStation[i];
        const len = (t.duration || 0) * 1000;
        // Only the main channel reports a real countdown (hide_counter false). For the
        // others we know where the song is only once we've seen it start.
        let ts = null;
        if (!t.hide_counter && len) ts = now - len + t.remainingSeconds * 1000;
        else if (prev && prev.key !== key) ts = now;
        else if (prev) ts = prev.ts;
        out[i] = {
          key, ts, len,
          artist: t.artistTitle || "", title: t.songTitle || "",
          art: t.image ? `${t.image.prefix}250x250${t.image.suffix}` : s.logo,
        };
      });
      return out;
    },

    // Centova Cast stations (Big B Radio): the station's own "now playing" call.
    async centova(indexes) {
      const out = {};
      await Promise.all(indexes.map(async i => {
        const s = STATIONS[i];
        try {
          const r = await fetch(s.rpc, { cache: "no-store" });
          if (!r.ok) throw new Error(r.status);
          const d = (await r.json()).data?.[0], t = d?.track;
          if (!t) { out[i] = null; return; }
          out[i] = {
            key: d.song || `${t.artist}|${t.title}`,
            artist: t.artist || "", title: t.title || "",
            art: t.imageurl && !/nocover/.test(t.imageurl) ? t.imageurl : null,
            ts: t.started ? t.started * 1000 : null, len: 0, listeners: d.listeners,
          };
        } catch (e) { console.warn("metadata", s.name, e); }
      }));
      return out;
    },

    // laut.fm: current song with exact start and end times, but no artwork.
    async lautfm(indexes) {
      // "2026-11-08 20:17:02 +0100" -> "2026-11-08T20:17:02+01:00"
      const time = t => Date.parse(t.replace(" ", "T").replace(/ ([+-]\d\d)(\d\d)$/, "$1:$2"));
      const out = {};
      await Promise.all(indexes.map(async i => {
        const s = STATIONS[i];
        try {
          const r = await fetch(`https://api.laut.fm/station/${s.laut}/current_song`, { cache: "no-store" });
          if (!r.ok) throw new Error(r.status);
          const t = await r.json();
          const ts = time(t.started_at), end = time(t.ends_at);
          out[i] = {
            key: `${t.id}|${t.started_at}`,
            artist: t.artist?.name?.trim() || "", title: t.title?.trim() || "",
            art: null, ts: isNaN(ts) ? null : ts, len: isNaN(end) ? 0 : end - ts,
          };
        } catch (e) { console.warn("metadata", s.name, e); }
      }));
      return out;
    },

    // KBS publishes the program on air, not the song: show its title, host and time slot.
    async kbs(indexes) {
      // Schedule times are "HHMMSSff" in Korea time (UTC+9).
      const KST = 9 * 3600e3;
      const at = hhmmss => {
        const k = new Date(Date.now() + KST);
        return Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate(),
          +hhmmss.slice(0, 2), +hhmmss.slice(2, 4), +hhmmss.slice(4, 6)) - KST;
      };
      const out = {};
      await Promise.all(indexes.map(async i => {
        const s = STATIONS[i];
        try {
          const r = await fetch(`https://static.api.kbs.co.kr/mediafactory/v1/schedule/onair_now?rtype=json&local_station_code=00&channel_code=${s.kbs}`, { cache: "no-store" });
          if (!r.ok) throw new Error(r.status);
          const p = (await r.json())[0]?.schedules?.[0];
          if (!p) { // nothing scheduled (overnight): show the channel logo
            out[i] = { key: "off-schedule", artist: "", title: "", art: s.logo || null, fit: "contain", ts: null, len: 0, noLookup: true };
            return;
          }
          let ts = at(p.service_start_time), end = at(p.service_end_time);
          if (ts > Date.now() + 3600e3) ts -= 864e5; // started before midnight KST
          if (end <= ts) end += 864e5;
          out[i] = {
            key: `${p.program_title}|${p.service_start_time}`,
            artist: p.program_title || "", title: p.program_actor ? `${L.host || ""} ${p.program_actor}`.trim() : "",
            // Program images and logos are wide, so fit them inside the square instead of cropping.
            art: p.image_w || s.logo || null, fit: "contain", ts, len: end - ts, noLookup: true,
          };
        } catch (e) { console.warn("metadata", s.name, e); }
      }));
      return out;
    },
  };

  // Cover art for songs whose station sends none: ask the iTunes Search API (CORS-open).
  // Only accept a hit whose artist resembles ours, so a shared song title can't pull in a stranger.
  const artCache = new Map();
  const norm = t => t.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
  function findArt(m) {
    if (!m.artist || !m.title) return Promise.resolve(null);
    const term = `${m.artist} ${m.title}`;
    if (!artCache.has(term)) {
      const want = norm(m.artist);
      artCache.set(term, fetch(`https://itunes.apple.com/search?entity=song&limit=5&term=${encodeURIComponent(term)}`)
        .then(r => r.ok ? r.json() : { results: [] })
        .then(d => {
          const hit = d.results.find(x => {
            const a = norm(x.artistName || "");
            return a && (a.includes(want) || want.includes(a) || a.split(" ")[0] === want.split(" ")[0]);
          });
          return hit ? hit.artworkUrl100.replace("100x100bb", "600x600bb") : null;
        })
        .catch(() => null));
    }
    return artCache.get(term);
  }

  let lastPoll = 0;
  async function refresh(indexes) {
    if (indexes.includes(state.idx)) lastPoll = Date.now();
    const bySource = {};
    indexes.forEach(i => (bySource[sourceOf(i)] ||= []).push(i));
    const results = await Promise.all(Object.entries(bySource).map(([name, ix]) =>
      SOURCES[name](ix).catch(e => { console.warn("metadata", name, e); return {}; })));
    const metas = Object.assign({}, ...results);
    for (const i of Object.keys(metas)) {
      const m = metas[i], prev = state.nowByStation[i];
      if (m && !m.art && prev && prev.key === m.key) m.art = prev.art; // keep art found earlier
      state.nowByStation[i] = m;
      updatePresetCaption(+i);
      if (m && !m.art && !m.noLookup) findArt(m).then(url => {
        if (!url) return;
        m.art = url;
        if (state.meta === m) { showArt(m); updateMediaSession(); }
      });
    }
    if (state.power && state.idx in metas) showMeta(metas[state.idx]);
  }
  const refreshCurrent = () => refresh([state.idx]);
  const refreshAll = () => refresh(STATIONS.map((_, i) => i));

  function updatePresetCaption(i) {
    const m = state.nowByStation[i];
    const now = m ? [m.artist, m.title].filter(Boolean).join(" – ") : "";
    presetEls[i].now.textContent = now || freqFor(i).toFixed(1) + " MHz";
    presetEls[i].b.title = now ? `${STATIONS[i].name}\n${now}` : STATIONS[i].name;
  }

  function setLine(el, text, animate) {
    const span = el.querySelector("span");
    if (span.textContent === text && !animate) return;
    span.textContent = text || " ";
    el.classList.remove("scroll", "swap");
    void el.offsetWidth;
    if (animate) el.classList.add("swap");
    requestAnimationFrame(() => {
      const over = span.scrollWidth - el.clientWidth;
      if (over > 4) {
        el.style.setProperty("--dist", -(over + 20) + "px");
        el.style.setProperty("--dur", Math.max(8, over / 25) + "s");
        el.classList.add("scroll");
      }
    });
  }

  function showMeta(m, force) {
    const prevKey = state.meta && state.meta.key;
    state.meta = m;
    const changed = force || !m || m.key !== prevKey;
    if (changed) {
      setLine($("artist"), m ? m.artist : "", true);
      setLine($("title"), m ? m.title : "", true);
      updateMediaSession();
    }
    showArt(m);
    // Footer: listener count when the source has one, otherwise the station's slogan.
    const tagline = (STATIONS[state.idx].tagline || "").replace(/^'|'$/g, "");
    $("info").textContent = m && m.listeners ? L.listening(m.listeners) : tagline;
    tickProgress();
  }

  function showArt(m) {
    const img = $("artImg"), src = (m && m.art) || "";
    if (img.dataset.src === src) return; // already showing (or loading) this one
    img.dataset.src = src;
    img.classList.toggle("contain", !!m && m.fit === "contain");
    img.classList.remove("show");
    $("artPh").style.display = "";
    if (!src) return;
    img.onload = () => { if (img.dataset.src === src) { img.classList.add("show"); $("artPh").style.display = "none"; } };
    img.src = src;
  }

  const fmt = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  function tickProgress() {
    const m = state.meta;
    if (!m || !m.len || m.ts == null) {
      $("bar").style.width = "0"; $("tPos").textContent = "-:--";
      $("tLen").textContent = m && m.len ? fmt(m.len) : "-:--";
      return;
    }
    const pos = Math.min(Date.now() - m.ts, m.len);
    $("bar").style.width = (pos / m.len * 100) + "%";
    $("tPos").textContent = fmt(pos);
    $("tLen").textContent = fmt(m.len);
  }

  function updateMediaSession() {
    const s = STATIONS[state.idx], m = state.meta;
    if (state.power) document.title = m ? `♪ ${m.artist} – ${m.title} · ${s.name}` : `${s.name} · ${C.title}`;
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: m ? m.title : s.name,
      artist: m ? m.artist : L.fallbackArtist,
      album: `${s.name} · FM ${freqFor(state.idx).toFixed(1)}`,
      artwork: m && m.art ? [{ src: m.art }] : [],
    });
    navigator.mediaSession.playbackState = state.power ? "playing" : "paused";
  }
  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession;
    ms.setActionHandler("play", () => setPower(true));
    ms.setActionHandler("pause", () => setPower(false));
    ms.setActionHandler("stop", () => setPower(false));
    ms.setActionHandler("nexttrack", () => step(1));
    ms.setActionHandler("previoustrack", () => step(-1));
  }

  // Poll the current station often (and sooner when a track should have ended),
  // the other presets occasionally for their captions.
  setInterval(() => {
    if (!state.power) return;
    tickProgress();
    const m = state.meta;
    const overdue = m && m.len && m.ts != null && Date.now() - m.ts > m.len;
    if (Date.now() - lastPoll > (overdue ? 4000 : 10000)) refreshCurrent();
  }, 1000);
  setInterval(() => { if (state.power && !document.hidden) refreshAll(); }, 60000);

  /* ---------- Spectrum + signal meter ---------- */
  const cv = $("spec"), g = cv.getContext("2d");
  let freqData, timeData, fakePhase = 0;
  function draw() {
    requestAnimationFrame(draw);
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const BARS = Math.max(16, Math.floor(w / 9));
    const live = state.power && state.tuned && !audio.paused;
    let levels = new Array(BARS).fill(0), rms = 0;
    if (live && analyser && !plain) {
      freqData = freqData || new Uint8Array(analyser.frequencyBinCount);
      timeData = timeData || new Uint8Array(analyser.fftSize);
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);
      // Log-spaced bins so bass doesn't hog the display.
      const n = freqData.length;
      for (let b = 0; b < BARS; b++) {
        const lo = Math.floor(Math.pow(n * 0.7, b / BARS)), hi = Math.max(lo + 1, Math.floor(Math.pow(n * 0.7, (b + 1) / BARS)));
        let sum = 0; for (let k = lo; k < hi; k++) sum += freqData[k];
        levels[b] = sum / (hi - lo) / 255;
      }
      let acc = 0; for (const v of timeData) { const x = (v - 128) / 128; acc += x * x; }
      rms = Math.min(1, Math.sqrt(acc / timeData.length) * 5);
    } else if (live) {
      fakePhase += 0.08; // plain mode: no analyser, so animate tastefully
      for (let b = 0; b < BARS; b++) levels[b] = 0.25 + 0.25 * Math.sin(fakePhase + b * 0.6) * Math.sin(fakePhase * 0.37 + b);
      rms = 0.6 + 0.2 * Math.sin(fakePhase);
    }
    const bw = w / BARS, seg = 3, gap = 1;
    for (let b = 0; b < BARS; b++) {
      const x = b * bw + 1;
      const segs = Math.floor(h / (seg + gap));
      const litN = Math.round(levels[b] * segs);
      for (let s = 0; s < segs; s++) {
        const y = h - (s + 1) * (seg + gap);
        const on = s < litN && state.power;
        g.fillStyle = on ? "#6ff3e4" : "rgba(111,243,228,.09)";
        g.shadowColor = on ? "rgba(111,243,228,.8)" : "transparent";
        g.shadowBlur = on ? 4 : 0;
        g.fillRect(x, y, bw - 3, seg);
      }
    }
    const litR = !state.power ? 0 : state.tuned ? Math.max(2, Math.round(rms * LADDER)) : 1;
    rungs.forEach((r, i) => { r.classList.toggle("on", i < litR); r.classList.toggle("hot", i >= LADDER - 2); });
  }
  requestAnimationFrame(draw);

  /* ---------- Knobs ---------- */
  function knob(el, { onDrag, onWheel, onKey }) {
    let last = null;
    el.addEventListener("pointerdown", e => { el.setPointerCapture(e.pointerId); last = { x: e.clientX, y: e.clientY }; e.preventDefault(); });
    el.addEventListener("pointermove", e => {
      if (!last) return;
      const d = (e.clientX - last.x) - (e.clientY - last.y);
      last = { x: e.clientX, y: e.clientY };
      onDrag(d);
    });
    const end = () => { last = null; };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("wheel", e => { e.preventDefault(); onWheel(e.deltaY < 0 ? 1 : -1); }, { passive: false });
    el.addEventListener("keydown", e => { if (onKey(e)) { e.preventDefault(); e.stopPropagation(); } });
  }

  // Tuning knob: free spinning; every 45px of drag (or a wheel notch) moves one station.
  const tuneRot = $("tuneKnob").querySelector(".rot");
  let tuneAngle = 0, tuneAcc = 0, wheelAt = 0;
  const spin = deg => { tuneAngle += deg; tuneRot.style.transform = `rotate(${tuneAngle}deg)`; };
  knob($("tuneKnob"), {
    onDrag(d) {
      spin(d * 1.4);
      tuneAcc += d;
      if (Math.abs(tuneAcc) >= 45) { step(Math.sign(tuneAcc)); tuneAcc = 0; }
    },
    onWheel(dir) {
      if (Date.now() - wheelAt < 160) return;
      wheelAt = Date.now(); spin(dir * 40); step(dir);
    },
    onKey(e) {
      const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (!d) return false;
      spin(d * 40); step(d); return true;
    },
  });

  const volRot = $("volKnob").querySelector(".rot");
  function setVol(v) {
    state.vol = Math.min(1, Math.max(0, v));
    if (state.muted && v > 0) state.muted = false;
    store.set("vol", state.vol);
    volRot.style.transform = `rotate(${-135 + 270 * state.vol}deg)`;
    $("volKnob").setAttribute("aria-valuenow", Math.round(state.vol * 100));
    applyVolume();
  }
  knob($("volKnob"), {
    onDrag: d => setVol(state.vol + d / 200),
    onWheel: dir => setVol(state.vol + dir * 0.05),
    onKey(e) {
      const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (!d) return false;
      setVol(state.vol + d * 0.05); return true;
    },
  });
  setVol(state.vol);

  /* ---------- Buttons + keyboard ---------- */
  const flash = id => { const l = $(id); l.classList.add("lit"); setTimeout(() => l.classList.remove("lit"), 180); };
  $("btnUp").addEventListener("click", () => { flash("ledUp"); step(1); });
  $("btnDown").addEventListener("click", () => { flash("ledDown"); step(-1); });
  $("btnScan").addEventListener("click", () => setScan(!state.scan));
  $("btnPower").addEventListener("click", () => setPower(!state.power));

  const press = el => { el.classList.add("pressed"); setTimeout(() => el.classList.remove("pressed"), 120); };
  document.addEventListener("keydown", e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= STATIONS.length) { press(presetEls[n - 1].b.querySelector(".key")); tune(n - 1); return; }
    switch (e.key) {
      case "ArrowRight": flash("ledUp"); spin(40); step(1); break;
      case "ArrowLeft": flash("ledDown"); spin(-40); step(-1); break;
      case "ArrowUp": setVol(state.vol + 0.05); break;
      case "ArrowDown": setVol(state.vol - 0.05); break;
      case "s": case "S": setScan(!state.scan); break;
      case "m": case "M": state.muted = !state.muted; applyVolume(); break;
      case " ": if (e.target.tagName === "BUTTON") return; setPower(!state.power); break;
      default: return;
    }
    e.preventDefault();
  });

  /* ---------- Init ---------- */
  if (!STATIONS.length) {
    $("stName").textContent = L.noStations;
  } else {
    renderStation();
    refreshAll(); // fill preset captions even while off
  }
})();
