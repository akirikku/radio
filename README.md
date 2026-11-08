# 茜 Akane Radio · 노을 Noeul · Radyo İstanbul · شفق Shafaq

Web radio players styled like a 1980s stereo receiver. They show the current artist, song and album art.

**▶ Listen:**
- **Japanese:** [akirikku.github.io/radio](https://akirikku.github.io/radio/) plays the [asia DREAM radio](https://asiadreamradio.com) stations
- **Korean:** [akirikku.github.io/radio/korea](https://akirikku.github.io/radio/korea/) plays K-pop from [Big B Radio](https://bigbradio.net) and [LISTEN.moe](https://listen.moe), plus Korean news on [KBS](https://www.kbs.co.kr) 1라디오 and 한민족방송. Every station is free of commercials.
- **Egyptian:** [akirikku.github.io/radio/egypt](https://akirikku.github.io/radio/egypt/) plays Arab Mix FM, Arab Mix Drama and OM Kalthom (أم كلثوم), from [Zeno.FM](https://zeno.fm)
- **Turkish:** [akirikku.github.io/radio/istanbul](https://akirikku.github.io/radio/istanbul/) plays the [İstanbul FM](https://www.istanbulfm.com.tr) stations

## Shared player (`player/`)

All radios run on the same code, so a change there shows up in each:

- `player/radio.css`: the look
- `player/radio.js`: builds the receiver, plays the streams (plain or HLS), and fetches song info. It has a
  song-info source for each kind of station (`asiadream`, `istanbulfm`, `centova`, `listenmoe`, `kbs`, `zeno`), and looks
  up cover art on iTunes for songs that arrive without any. A station marked `cors: false` (its stream sends no
  CORS header) plays outside Web Audio, so its spectrum is animated rather than measured.

Each radio's `index.html` is a small config: its labels, FM band, fonts and default song-info source. A station
can name its own source in `stations.js`, which is how the Korean radio mixes three.

## Japanese radio (repo root)

- `stations.md`: the station list (a name line, then the player page URL)
- `resolve_stations.py`: scrapes each player page for its stream and now-playing endpoints and writes `stations.js`
- `index.html`: the config, in English and Japanese

After editing `stations.md`, run `python3 resolve_stations.py`, then commit and push `stations.js`.

## Korean radio (`korea/`)

- `stations-korea.md`: the station list (a name line, then the station's page). Three kinds are understood:
  `bigbradio.net/<channel>`, `listen.moe/kpop` and KBS (`onair.kbs.co.kr/...ch_code=<n>`). Only add stations
  without commercials; laut.fm, for one, is ad-funded.
- `resolve_korea.py`: turns each page into stream and song-info settings and writes `korea/stations.js`
- `korea/index.html`: the config, in English and Korean

KBS stream links expire, so the player fetches a fresh one each time you tune in. KBS publishes the program on
air rather than the song, so its display shows the program, host and time slot. LISTEN.moe shows each song in
Hangul with its romanization alongside.

After editing `stations-korea.md`, run `python3 resolve_korea.py`, then commit and push `korea/stations.js`.

## Egyptian radio (`egypt/`)

- `stations-egypt.md`: the station list. Each block is the name, the name in Arabic, a short tagline, and the
  station's Zeno.FM stream link (`https://stream.zeno.fm/<mount>`).
- `resolve_egypt.py`: checks each stream answers and writes `egypt/stations.js`
- `egypt/index.html`: the config, in English and Arabic, with Arabic spellings for well-known artists

Song names come from Zeno's live feed. The Arab Mix stations send only "ON AIR", so they show the station's
Arabic name instead. Arabic lines run right to left on the display.

After editing `stations-egypt.md`, run `python3 resolve_egypt.py`, then commit and push `egypt/stations.js`.

## Turkish radio (`istanbul/`)

- `stations-istanbul.md`: the station list (a name line, then the istanbulfm.com.tr channel page URL)
- `resolve_istanbul.py`: looks up each channel's HLS stream in the İstanbul FM API and writes `istanbul/stations.js`
- `istanbul/index.html`: the config, in Turkish. It also loads hls.js for the HLS streams.

After editing `stations-istanbul.md`, run `python3 resolve_istanbul.py`, then commit and push `istanbul/stations.js`.
