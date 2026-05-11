# Content Formats

## Video Export Standard

Use this as the default house standard for full-length site videos:

- Container / codec: `MP4 / H.264`
- Resolution: `1920x1080`
- Frame rate: `30fps` or source fps
- Video bitrate: `8 Mbps`
- Audio: `AAC 160 kbps`
- Playback optimization: Fast Start enabled

This gives strong visual quality, broad browser support, and reliable streaming through CloudFront.

## Preview Clip Export

Use this for non-member preview clips:

- Container / codec: `MP4 / H.264`
- Resolution: `1920x1080` or `1280x720`
- Video bitrate: `2-4 Mbps`
- Audio: `AAC 128 kbps`
- Duration: `15-60 seconds`
- Playback optimization: Fast Start enabled

For teaser-style previews, `720p` is usually enough and loads faster.
