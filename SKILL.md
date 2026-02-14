---
name: youtube-feed
description: Fetch a YouTube channel's RSS feed and list video titles with published date (MM / DD). Use when the user says "youtube feed CHANNEL_ID" (e.g. youtube feed UC2D2CMWXMOVWx7giW1n3LIg) or asks for a channel's feed or recent videos. Use --json to get the full feed (including media:description with chapters/summaries) for analysis.
---

# YouTube Feed

Fetch the RSS (Atom) feed for a YouTube channel. By default lists title and published date; with `--json` outputs the full feed (including each video's description/summary and chapters from `media:description`) for analysis. No API key required.

**Requirements:** Node.js 18+ and npm.

## Before running

1. Run from the **project root** (the directory that contains `.cursor`). All paths below are relative to the project root.
2. Install and build once: `cd .cursor/skills/youtube-feed && npm install && npm run build`. Omit the build step if already built.

## Usage

From the project root:

**List (default): title and date only**

```bash
cd .cursor/skills/youtube-feed && node dist/get_feed.js UC2D2CMWXMOVWx7giW1n3LIg
cd .cursor/skills/youtube-feed && node dist/get_feed.js @hubermanlab
```

**Full feed for analysis (title, link, pubDate, description with chapters/summaries)**

```bash
cd .cursor/skills/youtube-feed && node dist/get_feed.js UC2D2CMWXMOVWx7giW1n3LIg --json
cd .cursor/skills/youtube-feed && node dist/get_feed.js @hubermanlab --json
```

**By channel name (optional):**

If you have a `channels.json` file in the **current working directory** (e.g. project root when you run from there), you can pass a channel handle and the skill will look up the ID:

Format of `channels.json`:

```json
{
  "channels": {
    "@hubermanlab": "UC2D2CMWXMOVWx7giW1n3LIg",
    "@SabineHossenfelder": "UC1yNl2E66ZzKApQdRuTQ4tw"
  }
}
```

- If the file does not exist or the channel name is not in the file, the skill prints an error and exits.
- You can build the file using the **youtube-channel-id** skill to resolve handles to IDs.

## Output

- **Default:** One line per video: `Title	MM / DD` (tab-separated). Title is the video title; date is the publication date in MM / DD format (e.g. `02 / 11` for Feb 11).
- **With `--json`:** A single JSON object: `{ "title", "link", "feedUrl", "items": [ { "title", "link", "pubDate", "description" }, ... ] }`. Each item's `description` is the full `media:description` from the feed (often includes chapters/timestamps and summary).

## Notes

- Feed URL used: `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`
- Uses the channel's public Atom feed (latest uploads). The script parses `media:group` / `media:description` so summaries and chapters are available when using `--json`.
