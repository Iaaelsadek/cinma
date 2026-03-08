# Embed Servers Health Report

- Generated at: 2026-03-07T19:19:28.316Z
- Servers tested: 19
- Test sample size per server: 500
- Delay config: 25ms + jitter up to 10ms

## Summary

| Server | Success % | Avg Latency (ms) | Passed/Total | 429 Hits | Blocked (403/503) | Health |
|---|---:|---:|---:|---:|---:|---|
| VidSrc.to | 99.8% | 167 | 499/500 | 0 | 0 | 🟢 ممتاز |
| VidSrc.cc | 58.8% | 194 | 294/500 | 109 | 0 | 🟡 متذبذب |
| AutoEmbed Co | 99.8% | 131 | 499/500 | 0 | 0 | 🟢 ممتاز |
| SmashyStream | 100.0% | 122 | 500/500 | 0 | 0 | 🟢 ممتاز |
| MovieBox | 100.0% | 182 | 500/500 | 0 | 0 | 🟢 ممتاز |
| StreamWish | 100.0% | 122 | 500/500 | 0 | 0 | 🟢 ممتاز |
| VidSrc.net | 0.0% | 376 | 0/500 | 437 | 0 | 🔴 ميت |
| VidSrc.net (Alt) | 0.0% | 366 | 0/500 | 437 | 0 | 🔴 ميت |
| 2Embed.skin | 0.0% | 173 | 0/500 | 0 | 0 | 🔴 ميت |
| 2Embed.cc | 0.0% | 170 | 0/500 | 0 | 0 | 🔴 ميت |
| MultiEmbed | 0.0% | 644 | 0/500 | 0 | 0 | 🔴 ميت |
| VidSrc.me | 0.0% | 478 | 0/500 | 0 | 0 | 🔴 ميت |
| VidSrc.xyz | 0.0% | 363 | 0/500 | 436 | 0 | 🔴 ميت |
| VidSrc.vip | 98.8% | 554 | 494/500 | 0 | 0 | 🟢 ممتاز |
| 111Movies | 48.8% | 386 | 244/500 | 251 | 0 | 🟡 متذبذب |
| VidSrc.icu | 0.0% | 650 | 0/500 | 0 | 0 | 🔴 ميت |
| VidSrc.io | 0.0% | 122 | 0/500 | 357 | 0 | 🔴 ميت |
| VidLink | 0.0% | 262 | 0/500 | 0 | 0 | 🔴 ميت |
| DatabaseGDrive | 0.0% | 473 | 0/500 | 0 | 0 | 🔴 ميت |

## Failure Samples

| Server | Type | TMDB ID | Status | Reason | URL |
|---|---|---:|---:|---|---|
| VidSrc.net | movie | 550 | 200 | body_failure_keyword | https://vidsrc.net/embed/movie/550 |
| VidSrc.net (Alt) | movie | 550 | 200 | body_failure_keyword | https://vidsrc.net/embed/movie/550 |
| 2Embed.skin | movie | 550 | 200 | body_failure_keyword | https://www.2embed.skin/embed/550 |
| 2Embed.cc | movie | 550 | 200 | body_failure_keyword | https://www.2embed.cc/embed/550 |
| MultiEmbed | movie | 550 | 200 | body_failure_keyword | https://multiembed.mov/?video_id=550&tmdb=1 |
| VidSrc.me | movie | 550 | 200 | body_failure_keyword | https://vidsrc.me/embed/movie/550 |
| VidSrc.xyz | movie | 550 | 200 | body_failure_keyword | https://vidsrc.xyz/embed/movie/550 |
| VidSrc.icu | movie | 550 | 200 | body_failure_keyword | https://vidsrc.icu/embed/movie/550 |
| VidSrc.io | movie | 550 | 200 | body_failure_keyword | https://vidsrc.io/embed/movie/550 |
| VidLink | movie | 550 | 200 | body_failure_keyword | https://vidlink.pro/movie/550 |
| DatabaseGDrive | movie | 550 | 200 | body_failure_keyword | https://databasegdriveplayer.co/player.php?tmdb=550 |
| VidSrc.net | movie | 680 | 200 | body_failure_keyword | https://vidsrc.net/embed/movie/680 |
| VidSrc.net (Alt) | movie | 680 | 200 | body_failure_keyword | https://vidsrc.net/embed/movie/680 |
| 2Embed.skin | movie | 680 | 200 | body_failure_keyword | https://www.2embed.skin/embed/680 |
| 2Embed.cc | movie | 680 | 200 | body_failure_keyword | https://www.2embed.cc/embed/680 |
| MultiEmbed | movie | 680 | 200 | body_failure_keyword | https://multiembed.mov/?video_id=680&tmdb=1 |
| VidSrc.me | movie | 680 | 200 | body_failure_keyword | https://vidsrc.me/embed/movie/680 |
| VidSrc.xyz | movie | 680 | 200 | body_failure_keyword | https://vidsrc.xyz/embed/movie/680 |
| VidSrc.icu | movie | 680 | 200 | body_failure_keyword | https://vidsrc.icu/embed/movie/680 |
| VidSrc.io | movie | 680 | 200 | body_failure_keyword | https://vidsrc.io/embed/movie/680 |
| VidLink | movie | 680 | 200 | body_failure_keyword | https://vidlink.pro/movie/680 |
| DatabaseGDrive | movie | 680 | 200 | body_failure_keyword | https://databasegdriveplayer.co/player.php?tmdb=680 |
| VidSrc.net | movie | 13 | 429 | bad_status | https://vidsrc.net/embed/movie/13 |
| VidSrc.net (Alt) | movie | 13 | 429 | bad_status | https://vidsrc.net/embed/movie/13 |
| 2Embed.skin | movie | 13 | 200 | body_failure_keyword | https://www.2embed.skin/embed/13 |
| 2Embed.cc | movie | 13 | 200 | body_failure_keyword | https://www.2embed.cc/embed/13 |
| MultiEmbed | movie | 13 | 200 | body_failure_keyword | https://multiembed.mov/?video_id=13&tmdb=1 |
| VidSrc.me | movie | 13 | 200 | body_failure_keyword | https://vidsrc.me/embed/movie/13 |
| VidSrc.xyz | movie | 13 | 429 | bad_status | https://vidsrc.xyz/embed/movie/13 |
| VidSrc.icu | movie | 13 | 200 | body_failure_keyword | https://vidsrc.icu/embed/movie/13 |
