# 茜 Akane Radio · 노을 Noeul · Radyo İstanbul

Web radio players styled like a 1980s stereo receiver. They show the current artist, song and album art.

**▶ Listen:**
- **Japanese:** [akirikku.github.io/radio](https://akirikku.github.io/radio/) plays the [asia DREAM radio](https://asiadreamradio.com) stations
- **Korean:** [akirikku.github.io/radio/korea](https://akirikku.github.io/radio/korea/) plays K-pop from [Big B Radio](https://bigbradio.net) and [laut.fm](https://laut.fm), plus trot and older songs on [KBS Happy FM](https://www.kbs.co.kr)
- **Turkish:** [akirikku.github.io/radio/istanbul](https://akirikku.github.io/radio/istanbul/) plays the [İstanbul FM](https://www.istanbulfm.com.tr) stations

## Shared player (`player/`)

All radios run on the same code, so a change there shows up in each:

- `player/radio.css`: the look
- `player/radio.js`: builds the receiver, plays the streams (plain or HLS), and fetches song info. It has a
  song-info source for each kind of station (`asiadream`, `istanbulfm`, `centova`, `lautfm`, `kbs`), and looks
  up cover art on iTunes for songs that arrive without any.

Each radio's `index.html` is a small config: its labels, FM band, fonts and default song-info source. A station
can name its own source in `stations.js`, which is how the Korean radio mixes three.

## Japanese radio (repo root)

- `stations.md`: the station list (a name line, then the player page URL)
- `resolve_stations.py`: scrapes each player page for its stream and now-playing endpoints and writes `stations.js`
- `index.html`: the config, in English and Japanese

After editing `stations.md`, run `python3 resolve_stations.py`, then commit and push `stations.js`.

## Korean radio (`korea/`)

- `stations-korea.md`: the station list (a name line, then the station's page). Three kinds are understood:
  `bigbradio.net/<channel>`, `laut.fm/<station>` and KBS (`onair.kbs.co.kr/...ch_code=<n>`).
- `resolve_korea.py`: turns each page into stream and song-info settings and writes `korea/stations.js`
- `korea/index.html`: the config, in English and Korean

KBS stream links expire, so the player fetches a fresh one each time you tune in. KBS publishes the program on
air rather than the song, so its display shows the program, host and time slot.

After editing `stations-korea.md`, run `python3 resolve_korea.py`, then commit and push `korea/stations.js`.

## Turkish radio (`istanbul/`)

- `stations-istanbul.md`: the station list (a name line, then the istanbulfm.com.tr channel page URL)
- `resolve_istanbul.py`: looks up each channel's HLS stream in the İstanbul FM API and writes `istanbul/stations.js`
- `istanbul/index.html`: the config, in Turkish. It also loads hls.js for the HLS streams.

After editing `stations-istanbul.md`, run `python3 resolve_istanbul.py`, then commit and push `istanbul/stations.js`.
