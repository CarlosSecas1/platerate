import { NextResponse } from "next/server";

const HANDLE_PATTERN = /^@?[A-Za-z0-9._-]{3,100}$/;

export async function GET(request: Request) {
  const rawHandle = new URL(request.url).searchParams.get("handle")?.trim() || "";
  if (!HANDLE_PATTERN.test(rawHandle)) {
    return NextResponse.json({ error: "Enter a valid YouTube handle." }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube lookup is temporarily unavailable." }, { status: 503 });
  }

  const handle = rawHandle.replace(/^@/, "");
  const params = new URLSearchParams({ part: "snippet,statistics", forHandle: handle, key: apiKey });

  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      const status = response.status === 403 ? 503 : 502;
      return NextResponse.json({ error: status === 503 ? "YouTube lookup is temporarily unavailable." : "YouTube could not complete the lookup." }, { status });
    }

    const data = await response.json() as { items?: Array<{ id: string; snippet: { title: string; customUrl?: string; thumbnails?: { default?: { url: string }; medium?: { url: string } } }; statistics: { subscriberCount?: string; hiddenSubscriberCount?: boolean } }> };
    const channel = data.items?.[0];
    if (!channel) return NextResponse.json({ error: "No YouTube channel was found for that handle." }, { status: 404 });

    const subscribers = channel.statistics.hiddenSubscriberCount || !channel.statistics.subscriberCount
      ? null
      : Number(channel.statistics.subscriberCount);

    return NextResponse.json({
      id: channel.id,
      title: channel.snippet.title,
      handle: channel.snippet.customUrl || `@${handle}`,
      thumbnail: channel.snippet.thumbnails?.medium?.url || channel.snippet.thumbnails?.default?.url || "",
      subscribers,
    }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
  } catch {
    return NextResponse.json({ error: "YouTube lookup is temporarily unavailable." }, { status: 503 });
  }
}
