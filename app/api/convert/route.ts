import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";

// Define TypeScript structures for our song items
interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  spotifyUri?: string;
  status: "pending" | "matched" | "failed";
}

// Helper functions to clean YouTube titles and extract artists
function cleanVideoTitle(title: string): string {
  return title
    .replace(/\s*[\(\[][oO]fficial\s*[vV]ideo[\)\]]/g, "")
    .replace(/\s*[\(\[][oO]fficial\s*[mM]usic\s*[vV]ideo[\)\]]/g, "")
    .replace(/\s*[\(\[][oO]fficial\s*[aA]udio[\)\]]/g, "")
    .replace(/\s*[\(\[][lL]yrics[\)\]]/g, "")
    .replace(/\s*[\(\[][lL]yric\s*[vV]ideo[\)\]]/g, "")
    .replace(/\s*HD/g, "")
    .replace(/\s*4K/g, "")
    .replace(/\s*\|.*/g, "")
    .trim();
}

function cleanArtistName(channel: string, title: string): string {
  if (title.includes(" - ")) {
    return title.split(" - ")[0].trim();
  }
  return channel.replace(/\s*-\s*Topic/g, "").replace(/\s*VEVO/g, "").trim();
}

// Query the user's Spotify OAuth Access Token from Better Auth database records
async function getSpotifyAccessToken(userId: string): Promise<string | null> {
  let token: string | null = null;
  
  if (process.env.DATABASE_URL) {
    const { Pool } = require("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
    });
    try {
      const res = await pool.query('SELECT "accessToken" FROM account WHERE "userId" = $1 AND "providerId" = $2', [userId, "spotify"]);
      if (res.rows.length > 0) {
        token = res.rows[0].accessToken;
      }
    } catch (e) {
      console.error("Failed to query Supabase for token:", e);
    }
    await pool.end();
  } else {
    if (process.env.VERCEL === "1") {
      throw new Error("Missing DATABASE_URL environment variable.");
    }
    const Database = require("better-sqlite3");
    const db = new Database("sqlite.db");
    try {
      const stmt = db.prepare("SELECT accessToken FROM account WHERE userId = ? AND providerId = ?");
      const row = stmt.get(userId, "spotify") as { accessToken: string } | undefined;
      if (row) {
        token = row.accessToken;
      }
    } catch (e) {
      console.error("Failed to query SQLite for token:", e);
    }
    db.close();
  }
  
  return token;
}

// Scrape YouTube playlist/video page and extract metadata
async function scrapeYoutubeUrl(url: string, requestedPlaylistName?: string): Promise<{ playlistName: string; tracks: Song[]; youtubeInfo: any }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch YouTube page. Status: ${response.status}`);
  }

  const html = await response.text();

  // Parse ytInitialData JSON from script block
  const regex = /ytInitialData\s*=\s*({.*?});/;
  const match = html.match(regex);
  
  if (!match) {
    // Fallback to title tag if json is missing
    const titleRegex = /<title>(.*?)<\/title>/;
    const titleMatch = html.match(titleRegex);
    const title = titleMatch ? titleMatch[1].replace(" - YouTube", "") : "YouTube Link";
    
    return {
      playlistName: requestedPlaylistName || title,
      youtubeInfo: {
        title: title,
        channel: "YouTube Video",
        thumbnail: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=120&h=120&q=80",
      },
      tracks: [
        {
          id: "scraped_1",
          title: cleanVideoTitle(title),
          artist: "Unknown Artist",
          duration: "3:00",
          thumbnail: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=120&h=120&q=80",
          status: "pending" as const
        }
      ]
    };
  }

  const json = JSON.parse(match[1]);
  
  // Determine if this is a watch-page request (video player) or a playlist page
  const isWatchPage = url.includes("watch?v=") || url.includes("watch?");

  if (isWatchPage) {
    let videoTitle = "YouTube Video";
    let channelName = "YouTube Creator";
    let thumbnail = "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=120&h=120&q=80";
    let duration = "3:30";

    // 1. YouTube Mix / Playlist Sidebar parsing on watch page
    if (url.includes("list=")) {
      try {
        const playlistObj = json.contents?.twoColumnWatchNextResults?.playlist?.playlist;
        if (playlistObj) {
          const playlistTitle = playlistObj.title || requestedPlaylistName || "YouTube Mix";
          const items = playlistObj.contents;
          if (items && Array.isArray(items)) {
            const playlistVideos: Song[] = items
              .filter((item: any) => item.playlistPanelVideoRenderer)
              .map((item: any, index: number) => {
                const renderer = item.playlistPanelVideoRenderer;
                const videoId = renderer.videoId;
                const vTitle = renderer.title?.runs?.[0]?.text || renderer.title?.simpleText || "Unknown Track";
                const uploader = renderer.shortBylineText?.runs?.[0]?.text || "Unknown Channel";
                const vDuration = renderer.lengthText?.simpleText || "3:30";
                const thumbs = renderer.thumbnail?.thumbnails;
                const vThumbnail = thumbs?.[thumbs.length - 1]?.url || "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=120&h=120&q=80";

                return {
                  id: videoId || `mix_${index}`,
                  title: cleanVideoTitle(vTitle),
                  artist: cleanArtistName(uploader, vTitle),
                  duration: vDuration,
                  thumbnail: vThumbnail,
                  status: "pending" as const
                };
              });

            if (playlistVideos.length > 0) {
              return {
                playlistName: requestedPlaylistName || playlistTitle,
                youtubeInfo: {
                  title: playlistTitle,
                  channel: "YouTube Mix",
                  thumbnail: playlistVideos[0].thumbnail
                },
                tracks: playlistVideos
              };
            }
          }
        }
      } catch (e) {
        console.error("Failed parsing watch page playlist sidebar details:", e);
      }
    }

    // 2. Single Video watch page parsing (if no list or list parsing failed)
    try {
      const results = json.contents?.twoColumnWatchNextResults?.results?.results?.contents;
      if (results && Array.isArray(results)) {
        const primaryInfo = results.find((r: any) => r.videoPrimaryInfoRenderer)?.videoPrimaryInfoRenderer;
        if (primaryInfo?.title?.runs?.[0]?.text) {
          videoTitle = primaryInfo.title.runs[0].text;
        }
        
        const secondaryInfo = results.find((r: any) => r.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer;
        if (secondaryInfo?.owner?.videoOwnerRenderer) {
          const owner = secondaryInfo.owner.videoOwnerRenderer;
          channelName = owner.title?.runs?.[0]?.text || channelName;
          const thumbs = owner.thumbnail?.thumbnails;
          thumbnail = thumbs?.[thumbs.length - 1]?.url || thumbnail;
        }
      }
    } catch (e) {
      console.error("Failed parsing watch video details:", e);
    }

    return {
      playlistName: requestedPlaylistName || videoTitle,
      youtubeInfo: {
        title: videoTitle,
        channel: channelName,
        thumbnail: thumbnail,
      },
      tracks: [
        {
          id: "watch_1",
          title: cleanVideoTitle(videoTitle),
          artist: cleanArtistName(channelName, videoTitle),
          duration: duration,
          thumbnail: thumbnail,
          status: "pending" as const
        }
      ]
    };
  } else {
    // 3. Standard Playlist page parsing (/playlist?list=...)
    let playlistTitle = requestedPlaylistName || "YouTube Playlist";
    let playlistVideos: Song[] = [];
    
    // Deep search helper to find keys
    const findDeepKey = (obj: any, targetKey: string): any => {
      if (!obj || typeof obj !== "object") return null;
      if (obj[targetKey]) return obj[targetKey];
      
      for (const key of Object.keys(obj)) {
        const result = findDeepKey(obj[key], targetKey);
        if (result) return result;
      }
      return null;
    };

    // Deep search helper to gather all matching items
    const findAllDeep = (obj: any, targetKey: string, results: any[] = []) => {
      if (!obj || typeof obj !== "object") return;
      if (obj[targetKey]) {
        results.push(obj[targetKey]);
      }
      for (const key of Object.keys(obj)) {
        findAllDeep(obj[key], targetKey, results);
      }
    };

    try {
      // Find Title
      const sidebarPrimary = findDeepKey(json, "playlistSidebarPrimaryInfoRenderer");
      if (sidebarPrimary?.title?.runs?.[0]?.text) {
        playlistTitle = sidebarPrimary.title.runs[0].text;
      } else {
        const headerTitle = findDeepKey(json, "playlistHeaderRenderer");
        if (headerTitle?.title?.simpleText) {
          playlistTitle = headerTitle.title.simpleText;
        } else if (headerTitle?.title?.runs?.[0]?.text) {
          playlistTitle = headerTitle.title.runs[0].text;
        }
      }

      // Find tracks via modern lockupViewModel
      const lockups: any[] = [];
      findAllDeep(json, "lockupViewModel", lockups);

      if (lockups.length > 0) {
        playlistVideos = lockups.map((lockup, index) => {
          const vTitle = lockup.metadata?.lockupMetadataViewModel?.title?.content || "Unknown Track";
          const uploader = lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || "Unknown Channel";
          
          let videoId = "";
          const findVideoId = (o: any) => {
            if (!o || typeof o !== "object") return;
            if (o.videoId && typeof o.videoId === "string") {
              videoId = o.videoId;
              return;
            }
            for (const k of Object.keys(o)) {
              findVideoId(o[k]);
              if (videoId) return;
            }
          };
          findVideoId(lockup);

          const thumbs = lockup.contentImage?.thumbnailViewModel?.image?.sources;
          const vThumbnail = thumbs?.[thumbs.length - 1]?.url || "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=120&h=120&q=80";

          return {
            id: videoId || `lockup_${index}`,
            title: cleanVideoTitle(vTitle),
            artist: cleanArtistName(uploader, vTitle),
            duration: "3:30",
            thumbnail: vThumbnail,
            status: "pending" as const
          };
        });
      }

      // Fallback to legacy playlistVideoRenderer
      if (playlistVideos.length === 0) {
        const legacyVideos: any[] = [];
        findAllDeep(json, "playlistVideoRenderer", legacyVideos);
        
        if (legacyVideos.length > 0) {
          playlistVideos = legacyVideos.map((renderer, index) => {
            const videoId = renderer.videoId;
            const vTitle = renderer.title?.runs?.[0]?.text || "Unknown Track";
            const uploader = renderer.shortBylineText?.runs?.[0]?.text || "Unknown Channel";
            const duration = renderer.lengthText?.simpleText || "3:30";
            const thumbs = renderer.thumbnail?.thumbnails;
            const vThumbnail = thumbs?.[thumbs.length - 1]?.url || "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=120&h=120&q=80";

            return {
              id: videoId || `video_${index}`,
              title: cleanVideoTitle(vTitle),
              artist: cleanArtistName(uploader, vTitle),
              duration: duration,
              thumbnail: vThumbnail,
              status: "pending" as const
            };
          });
        }
      }
    } catch (e) {
      console.error("Failed parsing playlist details:", e);
    }

    if (playlistVideos.length === 0) {
      throw new Error("No public tracks found in this YouTube URL.");
    }

    return {
      playlistName: requestedPlaylistName || playlistTitle,
      youtubeInfo: {
        title: playlistTitle,
        channel: "YouTube Playlist",
        thumbnail: playlistVideos[0]?.thumbnail || "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=120&h=120&q=80",
      },
      tracks: playlistVideos
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, url, playlistName } = body;

    // Retrieve active Better Auth session (requires async headers in Next.js 16)
    const activeHeaders = await headers();
    const session = await auth.api.getSession({
      headers: activeHeaders,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please connect your accounts first." }, { status: 401 });
    }

    if (action === "scan") {
      if (!url) {
        return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 });
      }

      if (url === "https://sentry-test" || url === "sentry-test") {
        throw new Error("Sentry Backend Serverless Test Error from BetterSync");
      }

      try {
        const scraped = await scrapeYoutubeUrl(url, playlistName);
        return NextResponse.json({
          mode: "database_live",
          playlistName: scraped.playlistName,
          totalTracks: scraped.tracks.length,
          tracks: scraped.tracks,
          youtubeInfo: scraped.youtubeInfo
        });
      } catch (err: any) {
        Sentry.captureException(err);
        console.error("YouTube scraping error:", err);
        return NextResponse.json(
          { error: err.message || "Failed to extract tracks from the provided YouTube URL. Ensure the playlist is public." },
          { status: 500 }
        );
      }
    }

    if (action === "transfer") {
      const { tracks, playlistName, targetPlaylistId, targetPlaylistUrl } = body;
      if (!tracks || !Array.isArray(tracks)) {
        return NextResponse.json({ error: "Tracks are required for transfer" }, { status: 400 });
      }

      // Query Spotify Access Token from database
      const spotifyToken = await getSpotifyAccessToken(session.user.id);
      if (!spotifyToken) {
        return NextResponse.json(
          { error: "Spotify account not connected. Please log in and link Spotify to your profile." },
          { status: 400 }
        );
      }

      try {
        let playlistId = targetPlaylistId;
        let playlistUrl = targetPlaylistUrl;

        // 1. Create the target Spotify playlist only if we don't already have a target playlist ID (e.g. on Retry)
        if (!playlistId) {
          const createPlaylistRes = await fetch("https://api.spotify.com/v1/me/playlists", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${spotifyToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              name: playlistName || "My YouTube Transfer",
              description: "Transferred via BetterSync",
              public: false
            })
          });
          if (!createPlaylistRes.ok) {
            const rawErr = await createPlaylistRes.text();
            console.error("Spotify Create Playlist Error:", rawErr);
            throw new Error(`Failed to create Spotify playlist: ${rawErr}`);
          }
          const playlistData = await createPlaylistRes.json();
          playlistId = playlistData.id;
          playlistUrl = playlistData.external_urls.spotify;
        }

        // 2. Search Spotify database with high-accuracy Search Cascade
        const matchedUris: string[] = [];
        const updatedTracks: Song[] = [];

        for (const track of tracks) {
          try {
            let matchFound = false;
            let spotifyTrackUri = "";

            // Attempt 1: Strict query (field-level search, high accuracy but fragile)
            const strictQuery = encodeURIComponent(`track:${track.title} artist:${track.artist}`);
            let searchRes = await fetch(`https://api.spotify.com/v1/search?q=${strictQuery}&type=track&limit=1`, {
              headers: { Authorization: `Bearer ${spotifyToken}` }
            });

            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const items = searchData.tracks?.items;
              if (items && items.length > 0) {
                spotifyTrackUri = items[0].uri;
                matchFound = true;
              }
            }

            // Attempt 2: Fuzzy text query (free-text search, letting Spotify's algorithm resolve spelling/remix details)
            if (!matchFound) {
              const fuzzyQuery = encodeURIComponent(`${track.title} ${track.artist}`);
              searchRes = await fetch(`https://api.spotify.com/v1/search?q=${fuzzyQuery}&type=track&limit=1`, {
                headers: { Authorization: `Bearer ${spotifyToken}` }
              });

              if (searchRes.ok) {
                const searchData = await searchRes.json();
                const items = searchData.tracks?.items;
                if (items && items.length > 0) {
                  spotifyTrackUri = items[0].uri;
                  matchFound = true;
                }
              }
            }

            // Attempt 3: Relaxed primary title search (cleaning out feat., ft., or secondary details)
            if (!matchFound) {
              const cleanTitle = track.title.split(/\s*feat\.*\s*/i)[0].split(/\s*ft\.*\s*/i)[0].trim();
              const primaryArtist = track.artist.split(",")[0].trim();
              const relaxedQuery = encodeURIComponent(`${cleanTitle} ${primaryArtist}`);
              searchRes = await fetch(`https://api.spotify.com/v1/search?q=${relaxedQuery}&type=track&limit=1`, {
                headers: { Authorization: `Bearer ${spotifyToken}` }
              });

              if (searchRes.ok) {
                const searchData = await searchRes.json();
                const items = searchData.tracks?.items;
                if (items && items.length > 0) {
                  spotifyTrackUri = items[0].uri;
                  matchFound = true;
                }
              }
            }

            if (matchFound) {
              matchedUris.push(spotifyTrackUri);
              updatedTracks.push({
                ...track,
                status: "matched" as const,
                spotifyUri: spotifyTrackUri
              });
              continue;
            }
          } catch (e) {
            console.error("Spotify search error for:", track.title, e);
          }
          
          updatedTracks.push({
            ...track,
            status: "failed" as const
          });
        }

        // 3. Add the matched URIs into the Spotify playlist
        if (matchedUris.length > 0) {
          const addRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/items`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${spotifyToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ uris: matchedUris })
          });
          if (!addRes.ok) {
            console.error("Failed to add tracks into playlist:", await addRes.text());
          }
        }

        const successCount = updatedTracks.filter((t) => t.status === "matched").length;

        return NextResponse.json({
          success: true,
          playlistId: playlistId,
          playlistUrl: playlistUrl,
          summary: {
            total: updatedTracks.length,
            transferred: successCount,
            failed: updatedTracks.length - successCount,
            accuracy: Math.round((successCount / updatedTracks.length) * 100),
          },
          tracks: updatedTracks
        });
      } catch (err: any) {
        Sentry.captureException(err);
        console.error("Spotify API process error:", err);
        return NextResponse.json({ error: err.message || "Failed to complete Spotify sync." }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    Sentry.captureException(error);
    console.error("API Convert Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
