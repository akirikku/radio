# 茜 Akane Radio · Radyo İstanbul

Web radio players styled like a 1980s stereo receiver. They show the current artist, song and album art.

**▶ Listen:**
- **Japanese:** [akirikku.github.io/radio](https://akirikku.github.io/radio/) plays the [asia DREAM radio](https://asiadreamradio.com) stations
- **Turkish:** [akirikku.github.io/radio/istanbul](https://akirikku.github.io/radio/istanbul/) plays the [İstanbul FM](https://www.istanbulfm.com.tr) stations

## Shared player (`player/`)

Both radios run on the same code, so a change there shows up in both:

- `player/radio.css`: the look
- `player/radio.js`: builds the receiver, plays the streams (plain or HLS), and fetches song info. It has a
  song-info source for each station network (`asiadream`, `istanbulfm`).

Each radio's `index.html` is a small config: its labels, FM band, fonts and which song-info source to use.

## Japanese radio (repo root)

- `stations.md`: the station list (a name line, then the player page URL)
- `resolve_stations.py`: scrapes each player page for its stream and now-playing endpoints and writes `stations.js`
- `index.html`: the config, in English and Japanese

After editing `stations.md`, run `python3 resolve_stations.py`, then commit and push `stations.js`.

## Turkish radio (`istanbul/`)

- `stations-istanbul.md`: the station list (a name line, then the istanbulfm.com.tr channel page URL)
- `resolve_istanbul.py`: looks up each channel's HLS stream in the İstanbul FM API and writes `istanbul/stations.js`
- `istanbul/index.html`: the config, in Turkish. It also loads hls.js for the HLS streams.

After editing `stations-istanbul.md`, run `python3 resolve_istanbul.py`, then commit and push `istanbul/stations.js`.
