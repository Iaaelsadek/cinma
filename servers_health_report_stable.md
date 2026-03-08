# Embed Servers Health Report

- Generated at: 2026-03-07T18:11:29.116Z
- Servers tested: 15
- Test sample size per server: 100
- Delay config: 900ms + jitter up to 250ms

## Summary

| Server | Success % | Avg Latency (ms) | Passed/Total | 429 Hits | Blocked (403/503) | Health |
|---|---:|---:|---:|---:|---:|---|
| VidSrc.net | 0.0% | 493 | 0/100 | 73 | 0 | 🔴 ميت |
| VidSrc.cc | 99.0% | 243 | 99/100 | 0 | 0 | 🟢 ممتاز |
| AutoEmbed Co | 49.0% | 204 | 49/100 | 0 | 0 | 🟡 متذبذب |
| VidSrc.net (Alt) | 0.0% | 484 | 0/100 | 74 | 0 | 🔴 ميت |
| 2Embed.skin | 0.0% | 307 | 0/100 | 0 | 0 | 🔴 ميت |
| 2Embed.cc | 0.0% | 302 | 0/100 | 0 | 0 | 🔴 ميت |
| MultiEmbed | 0.0% | 720 | 0/100 | 0 | 0 | 🔴 ميت |
| VidSrc.me | 0.0% | 622 | 0/100 | 0 | 0 | 🔴 ميت |
| VidSrc.xyz | 0.0% | 452 | 0/100 | 75 | 0 | 🔴 ميت |
| VidSrc.vip | 100.0% | 610 | 100/100 | 0 | 0 | 🟢 ممتاز |
| 111Movies | 99.0% | 461 | 99/100 | 0 | 0 | 🟢 ممتاز |
| VidSrc.icu | 0.0% | 694 | 0/100 | 0 | 0 | 🔴 ميت |
| VidSrc.io | 0.0% | 208 | 0/100 | 43 | 0 | 🔴 ميت |
| VidLink | 0.0% | 268 | 0/100 | 0 | 0 | 🔴 ميت |
| DatabaseGDrive | 0.0% | 638 | 0/100 | 0 | 0 | 🔴 ميت |

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
| VidSrc.xyz | movie | 680 | 429 | bad_status | https://vidsrc.xyz/embed/movie/680 |
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
