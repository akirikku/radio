# 茜 Akane Radio · 노을 Noeul

Web radio players styled like a 1980s stereo receiver. They show the current artist, song and album art.

**▶ Listen:** [akirikku.github.io/radio](https://akirikku.github.io/radio/) is a landing page for both radios
- **Japanese:** [akirikku.github.io/radio/japan](https://akirikku.github.io/radio/japan/) plays the [asia DREAM radio](https://asiadreamradio.com) stations
- **Korean:** [akirikku.github.io/radio/korea](https://akirikku.github.io/radio/korea/) plays K-pop from [Big B Radio](https://bigbradio.net) and [LISTEN.moe](https://listen.moe), plus Korean news on [KBS](https://www.kbs.co.kr) 1라디오 and 한민족방송. Every station is free of commercials.

## Shared player (`player/`)

All radios run on the same code, so a change there shows up in each:

- `player/radio.css`: the look
- `player/radio.js`: builds the receiver, plays the streams (plain or HLS), and fetches song info. It has a
  song-info source for each kind of station (`asiadream`, `centova`, `listenmoe`, `kbs`), and looks
  up cover art on iTunes for songs that arrive without any. A station marked `cors: false` (its stream sends no
  CORS header) plays outside Web Audio, so its spectrum is animated rather than measured.

Each radio's `index.html` is a small config: its labels, FM band, fonts and default song-info source. A station
can name its own source in `stations.js`, which is how the Korean radio mixes three.

## Landing page (`index.html`)

A faceplate for each radio that links to it. Each one scans through its radio's presets, read from the same
`stations.js` the player uses, so it stays current when a station list changes.

## Japanese radio (`japan/`)

- `stations.md`: the station list (a name line, then the player page URL)
- `resolve_stations.py`: scrapes each player page for its stream and now-playing endpoints and writes `japan/stations.js`
- `japan/index.html`: the config, in English and Japanese

After editing `stations.md`, run `python3 resolve_stations.py`, then commit and push `japan/stations.js`.

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
