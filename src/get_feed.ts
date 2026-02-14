#!/usr/bin/env node
/**
 * Fetch a YouTube channel's RSS (Atom) feed.
 *
 * Usage:
 *   node dist/get_feed.js CHANNEL_ID              # list: title + date (default)
 *   node dist/get_feed.js CHANNEL_ID --json       # full feed as JSON for analysis
 *   node dist/get_feed.js @channelname            # requires channels.json in cwd
 *
 * Example:
 *   node dist/get_feed.js UC2D2CMWXMOVWx7giW1n3LIg
 *   node dist/get_feed.js @hubermanlab --json
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import Parser from "rss-parser";

const FEED_URL = "https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}";
const CHANNELS_FILE = join(process.cwd(), "channels.json");

interface ChannelsFile {
  channels: Record<string, string>;
}

/** Parsed item with YouTube media:group (media:description = summary/chapters). */
interface YouTubeFeedItem extends Parser.Item {
  mediaGroup?: { "media:description"?: unknown[] };
}

/** Channel IDs are 24 chars and start with UC. */
function isChannelId(arg: string): boolean {
  return /^UC[\w-]{22}$/.test(arg);
}

function loadChannelsFile(): ChannelsFile | null {
  if (!existsSync(CHANNELS_FILE)) return null;
  try {
    const raw = readFileSync(CHANNELS_FILE, "utf-8");
    const data = JSON.parse(raw) as ChannelsFile;
    if (data && typeof data.channels === "object" && data.channels !== null) return data;
  } catch {
    // invalid json or missing .channels
  }
  return null;
}

function resolveChannelId(arg: string): string {
  const trimmed = arg.trim();
  if (!trimmed) {
    process.stderr.write("Usage: node get_feed.js CHANNEL_ID_or_@name [--json]\n");
    process.exit(1);
  }

  if (isChannelId(trimmed)) return trimmed;

  const name = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  const channels = loadChannelsFile();
  if (!channels) {
    process.stderr.write(`channels.json not found at ${CHANNELS_FILE}. Add a file with { "channels": { "@name": "UC..." } } to use channel names.\n`);
    process.exit(1);
  }
  const id = channels.channels[name];
  if (!id) {
    process.stderr.write(`Channel "${name}" not found in ${CHANNELS_FILE}. Add an entry like "${name}": "UC..." to channels.\n`);
    process.exit(1);
  }
  return id;
}

/** Parse date string and return MM / DD. */
function formatPublished(dateStr: string): string {
  const date = new Date(dateStr);
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${m} / ${d}`;
}

/** Extract media:description text from parsed item (summary, chapters/timestamps). */
function getMediaDescription(item: YouTubeFeedItem): string {
  const group = item.mediaGroup;
  if (!group || !Array.isArray(group["media:description"])) return "";
  const raw = group["media:description"][0];
  if (typeof raw === "string") return raw;
  if (raw && typeof (raw as { _?: string })._ === "string") return (raw as { _: string })._;
  return "";
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const jsonMode = argv.includes("--json");
  const input = argv.find((a) => a !== "--json") ?? "";
  const channelId = resolveChannelId(input);
  const url = FEED_URL.replace("{channel_id}", channelId);

  const parser = new Parser<Parser.Output<YouTubeFeedItem>, YouTubeFeedItem>({
    customFields: {
      item: [["media:group", "mediaGroup"]],
    },
  });

  let feed: Parser.Output<YouTubeFeedItem>;
  try {
    feed = await parser.parseURL(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Failed to fetch feed: ${msg}\n`);
    process.exit(1);
  }

  if (!feed.items?.length) {
    if (jsonMode) process.stdout.write(JSON.stringify({ title: feed.title, link: feed.link, feedUrl: feed.feedUrl, items: [] }, null, 2));
    process.exit(0);
  }

  if (jsonMode) {
    const full = {
      title: feed.title,
      link: feed.link,
      feedUrl: feed.feedUrl,
      items: feed.items.map((item) => ({
        title: item.title ?? "",
        link: item.link ?? "",
        pubDate: item.pubDate ?? item.isoDate ?? "",
        description: getMediaDescription(item),
      })),
    };
    process.stdout.write(JSON.stringify(full, null, 2));
    return;
  }

  for (const item of feed.items) {
    const title = item.title ?? "";
    const dateStr = item.pubDate ?? item.isoDate ?? "";
    const published = dateStr ? formatPublished(dateStr) : "";
    process.stdout.write(`${title}\t${published}\n`);
  }
}

main();
