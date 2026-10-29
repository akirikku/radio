# 茜 Akane Radio

A web-based Japanese radio player styled like a 1980s Japanese stereo receiver. It plays the
[asia DREAM radio](https://asiadreamradio.com) stations and shows the current artist, song and album art.

- `stations.md`: the station list (a name line, then the player page URL)
- `resolve_stations.py`: scrapes each player page for its stream and now-playing endpoints and writes `stations.js`
- `index.html`: the player

After editing `stations.md`, run `python3 resolve_stations.py`, then commit and push `stations.js`.
