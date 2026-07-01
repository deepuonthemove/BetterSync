"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowRight, 
  Check, 
  Database, 
  Sparkles, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ExternalLink, 
  Lock, 
  Sparkle,
  Zap,
  Clock,
  Layers,
  HelpCircle
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  spotifyUri?: string;
  status: "pending" | "matched" | "failed";
}

interface ScannedPlaylist {
  playlistName: string;
  totalTracks: number;
  tracks: Song[];
  youtubeInfo: {
    title: string;
    channel: string;
    thumbnail: string;
  };
}

// Custom SVG Brand Icons to guarantee compilation and clean logos
const Youtube = ({ size = 24, color = "currentColor", ...props }: React.SVGProps<SVGSVGElement> & { size?: number; color?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill={color} 
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const Spotify = ({ size = 24, color = "currentColor", ...props }: React.SVGProps<SVGSVGElement> & { size?: number; color?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill={color} 
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm5.422 14.43c-.19.31-.59.41-.9.22-2.42-1.48-5.46-1.81-9.06-1-.35.08-.7-.14-.78-.49-.08-.35.14-.7.49-.78 3.94-.9 7.3-.52 10.03 1.15.3.18.4.59.22.9zm1.14-2.73c-.24.39-.75.51-1.14.27-2.77-1.7-7-2.2-10.27-1.21-.44.13-.91-.12-1.04-.56-.13-.44.12-.91.56-1.04 3.73-1.13 8.39-.58 11.55 1.37.39.24.51.75.27 1.14l.07.03zm.1-2.85C15.22 8.76 9.27 8.56 5.83 9.6c-.53.16-1.09-.14-1.25-.67-.16-.53.14-1.09.67-1.25 3.96-1.2 10.54-.97 14.7 1.5.48.29.64.91.35 1.39-.29.48-.91.64-1.39.35z"/>
  </svg>
);

export default function ConverterClient() {
  // Better Auth session hooks
  const { data: session } = authClient.useSession();

  // Authentication states linked to the database session
  const [isYoutubeConnected, setIsYoutubeConnected] = useState(false);
  const [youtubeProfile, setYoutubeProfile] = useState<{ name: string; avatar: string } | null>(null);
  
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [spotifyProfile, setSpotifyProfile] = useState<{ name: string; avatar: string } | null>(null);

  // Conversion / Scanner states
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPlaylist, setScannedPlaylist] = useState<ScannedPlaylist | null>(null);
  const [selectedTracks, setSelectedTracks] = useState<Record<string, boolean>>({});
  
  const [targetPlaylistName, setTargetPlaylistName] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionTracks, setConversionTracks] = useState<Song[]>([]);
  const [convertedResult, setConvertedResult] = useState<{
    playlistUrl: string;
    summary: { total: number; transferred: number; failed: number; accuracy: number };
  } | null>(null);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [activePlaylistUrl, setActivePlaylistUrl] = useState<string | null>(null);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [importMode, setImportMode] = useState<"url" | "text">("url");
  const [textList, setTextList] = useState("");

  // Toast Notification HUD State
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" | "info" }[]>([]);

  // Synchronize live accounts via DB query
  const fetchConnectedAccounts = async () => {
    try {
      const response = await fetch("/api/auth/connected-providers");
      const data = await response.json();
      if (data.providers) {
        const hasGoogle = data.providers.includes("google");
        const hasSpotify = data.providers.includes("spotify");
        
        setIsYoutubeConnected(hasGoogle);
        setIsSpotifyConnected(hasSpotify);

        if (hasGoogle) {
          setYoutubeProfile({
            name: data.profiles?.google?.name || session?.user.name || "YouTube User",
            avatar: data.profiles?.google?.avatar || session?.user.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
          });
        } else {
          setYoutubeProfile(null);
        }

        if (hasSpotify) {
          setSpotifyProfile({
            name: data.profiles?.spotify?.name || "Spotify User",
            avatar: data.profiles?.spotify?.avatar || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=80&h=80&q=80"
          });
        } else {
          setSpotifyProfile(null);
        }
      }
    } catch (err) {
      console.error("Failed querying connected accounts:", err);
    }
  };

  useEffect(() => {
    if (session) {
      fetchConnectedAccounts();
    } else {
      setIsYoutubeConnected(false);
      setIsSpotifyConnected(false);
      setYoutubeProfile(null);
      setSpotifyProfile(null);
    }
  }, [session]);

  // Refresh auth status reactively when user focuses back on the main tab
  useEffect(() => {
    const handleFocus = async () => {
      const updated = await authClient.getSession();
      if (updated?.data) {
        await fetchConnectedAccounts();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [session]);

  // Read URL query parameter "?import=" to load data sent from the Browser automation Userscript
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const importData = searchParams.get("import");
      if (importData) {
        try {
          const decoded = decodeURIComponent(importData);
          const rawTracks = JSON.parse(decoded);
          if (Array.isArray(rawTracks)) {
            const parsedTracks: Song[] = rawTracks.map((track: any, index: number) => ({
              id: track.id || `userscript_import_${index}_${Date.now()}`,
              title: track.title || "Unknown Track",
              artist: track.artist || "Unknown Artist",
              duration: track.duration || "3:30",
              thumbnail: track.thumbnail || "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=120&h=120&q=80",
              status: "pending" as const
            }));

            setScannedPlaylist({
              playlistName: "YouTube Automated Mix",
              totalTracks: parsedTracks.length,
              youtubeInfo: {
                title: "YouTube Automated Mix",
                channel: "Browser Automation Scraper",
                thumbnail: parsedTracks[0]?.thumbnail || "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=120&h=120&q=80"
              },
              tracks: parsedTracks
            });
            setTargetPlaylistName("My Automated Sync");

            // Select all tracks by default
            const initialSelection: Record<string, boolean> = {};
            parsedTracks.forEach((t) => {
              initialSelection[t.id] = true;
            });
            setSelectedTracks(initialSelection);

            // Clean URL query parameters to look neat
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Trigger toast alert asynchronously to allow DOM rendering
            setTimeout(() => {
              addToast(`Successfully imported ${parsedTracks.length} tracks from YouTube automation!`, "success");
            }, 500);
          }
        } catch (e) {
          console.error("Failed to parse automation import payload:", e);
        }
      }
    }
  }, []);

  // Helpers for adding toast alerts
  const addToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Real public YouTube playlist URLs for testing
  const loadPreset = (presetType: "lofi" | "synthwave" | "acoustic") => {
    let presetUrl = "";
    if (presetType === "lofi") {
      presetUrl = "https://www.youtube.com/playlist?list=PL6NDKXsPL0_IaXF5H4XJgHti_ip-tNsqt";
    } else if (presetType === "synthwave") {
      presetUrl = "https://www.youtube.com/playlist?list=PL3oW2tjiIxvQ1K_Vrs7fV78sW75X_Wj6W";
    } else if (presetType === "acoustic") {
      presetUrl = "https://www.youtube.com/playlist?list=PLVvJk1a9e9tH0wXqOqO6mQpEqi_Eee6Kk";
    }
    setUrl(presetUrl);
    addToast(`Selected public ${presetType === "lofi" ? "Lofi Chill" : presetType === "synthwave" ? "Synthwave Drive" : "Acoustic Cozy"} Playlist URL.`, "info");
  };

  // Connect & Log in handlers using real Better Auth redirect flows in a new tab
  const handleConnectYoutube = async () => {
    try {
      if (isYoutubeConnected) {
        await authClient.signOut();
        addToast("Logged out of session.", "info");
        return;
      }
      
      let authUrl: string | undefined;
      if (session) {
        addToast("Opening YouTube connection in a new tab...", "info");
        const res = await authClient.linkSocial({
          provider: "google",
          callbackURL: window.location.origin,
          disableRedirect: true
        });
        authUrl = res.data?.url;
      } else {
        addToast("Opening YouTube login in a new tab...", "info");
        const res = await authClient.signIn.social({
          provider: "google",
          callbackURL: window.location.origin,
          disableRedirect: true
        });
        authUrl = res.data?.url;
      }

      if (authUrl) {
        window.open(authUrl, "_blank");
      }
    } catch (err: any) {
      addToast(err.message || "Failed to link Google account", "error");
    }
  };

  const handleConnectSpotify = async () => {
    try {
      if (isSpotifyConnected) {
        await authClient.signOut();
        addToast("Logged out of session.", "info");
        return;
      }

      let authUrl: string | undefined;
      if (session) {
        addToast("Opening Spotify connection in a new tab...", "info");
        const res = await authClient.linkSocial({
          provider: "spotify",
          callbackURL: window.location.origin,
          disableRedirect: true
        });
        authUrl = res.data?.url;
      } else {
        addToast("Opening Spotify login in a new tab...", "info");
        const res = await authClient.signIn.social({
          provider: "spotify",
          callbackURL: window.location.origin,
          disableRedirect: true
        });
        authUrl = res.data?.url;
      }

      if (authUrl) {
        window.open(authUrl, "_blank");
      }
    } catch (err: any) {
      addToast(err.message || "Failed to link Spotify account", "error");
    }
  };

  // Scan YouTube URL details via Scraping pipeline
  const handleScanPlaylist = async () => {
    if (!url) {
      addToast("Please enter or select a YouTube URL first.", "error");
      return;
    }
    setIsScanning(true);
    setScannedPlaylist(null);
    setConvertedResult(null);
    setActivePlaylistId(null);
    setActivePlaylistUrl(null);

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan", url })
      });
      const data = await response.json();
      
      if (response.ok) {
        setScannedPlaylist(data);
        setTargetPlaylistName(data.playlistName);
        
        // Select all tracks by default
        const initialSelection: Record<string, boolean> = {};
        data.tracks.forEach((track: Song) => {
          initialSelection[track.id] = true;
        });
        setSelectedTracks(initialSelection);
        addToast(`Successfully parsed ${data.tracks.length} tracks from YouTube page!`, "success");
      } else {
        addToast(data.error || "Failed to parse YouTube page details.", "error");
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Import custom text list of tracks (e.g. from YouTube Mix Console Scraper)
  const handleImportTextList = () => {
    if (!textList.trim()) {
      addToast("Please enter at least one track to import.", "error");
      return;
    }
    setIsScanning(true);
    setScannedPlaylist(null);
    setConvertedResult(null);
    setActivePlaylistId(null);
    setActivePlaylistUrl(null);

    try {
      const lines = textList.split("\n").map(l => l.trim()).filter(Boolean);
      const parsedTracks: Song[] = lines.map((line, index) => {
        let title = line;
        let artist = "Unknown Artist";
        
        const splitters = [" - ", " – ", " — ", "\t", " by "];
        for (const splitter of splitters) {
          const parts = line.split(splitter);
          if (parts.length > 1) {
            title = parts[0].trim();
            artist = parts.slice(1).join(splitter).trim();
            break;
          }
        }

        return {
          id: `text_import_${index}_${Date.now()}`,
          title: title,
          artist: artist,
          duration: "3:30",
          thumbnail: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=120&h=120&q=80",
          status: "pending" as const
        };
      });

      if (parsedTracks.length === 0) {
        throw new Error("No valid tracks parsed from the list.");
      }

      setScannedPlaylist({
        playlistName: "Custom Import List",
        totalTracks: parsedTracks.length,
        youtubeInfo: {
          title: "Custom Import",
          channel: "Local User",
          thumbnail: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=120&h=120&q=80"
        },
        tracks: parsedTracks
      });
      setTargetPlaylistName("My Custom Sync");

      // Select all by default
      const initialSelection: Record<string, boolean> = {};
      parsedTracks.forEach((track) => {
        initialSelection[track.id] = true;
      });
      setSelectedTracks(initialSelection);

      addToast(`Successfully imported ${parsedTracks.length} tracks!`, "success");
    } catch (e: any) {
      addToast(e.message || "Failed to import track list.", "error");
    } finally {
      setIsScanning(false);
    }
  };

  // Automated browser mix capture pipeline (triggers userscript on YouTube watch page)
  const handleAutomateMixCapture = () => {
    if (!url) {
      addToast("Please enter a YouTube Mix URL first.", "error");
      return;
    }
    
    const connector = url.includes("?") ? "&" : "?";
    const automatedUrl = url + connector + "bettersync=true";
    
    addToast("Launching automated mix scraper...", "info");
    window.open(automatedUrl, "_blank");
  };

  // Toggle single track selection checkmarks
  const toggleTrack = (id: string) => {
    setSelectedTracks((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Toggle all tracks at once
  const toggleAllTracks = () => {
    if (!scannedPlaylist) return;
    const allSelected = Object.values(selectedTracks).every(Boolean);
    const updated: Record<string, boolean> = {};
    scannedPlaylist.tracks.forEach((t) => {
      updated[t.id] = !allSelected;
    });
    setSelectedTracks(updated);
  };

  // Start conversion sync via Spotify Web API
  const handleStartSync = async () => {
    if (!scannedPlaylist) return;
    
    const tracksToSync = scannedPlaylist.tracks.filter((t) => selectedTracks[t.id]);
    if (tracksToSync.length === 0) {
      addToast("Please select at least one track to transfer.", "error");
      return;
    }

    setIsConverting(true);
    setConversionProgress(0);
    setConvertedResult(null);

    // Initialize sync tracks with pending status
    const initialTracks = tracksToSync.map((t) => ({ ...t, status: "pending" as const }));
    setConversionTracks(initialTracks);

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          playlistName: targetPlaylistName,
          tracks: tracksToSync,
          targetPlaylistId: activePlaylistId,
          targetPlaylistUrl: activePlaylistUrl
        })
      });
      const resultData = await response.json();

      if (!response.ok) {
        addToast(resultData.error || "Failed to sync tracks to Spotify.", "error");
        setIsConverting(false);
        return;
      }

      // Progress animation update loops
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < initialTracks.length) {
          const index = currentIndex; // Capture index in block-scoped constant to prevent async closure out-of-bound errors
          setConversionTracks((prev) => {
            const copy = [...prev];
            const resultTrack = resultData.tracks?.[index];
            if (resultTrack && copy[index]) {
              copy[index] = {
                ...copy[index],
                status: resultTrack.status,
                spotifyUri: resultTrack.spotifyUri
              };
            }
            return copy;
          });

          currentIndex++;
          setConversionProgress(Math.round((currentIndex / initialTracks.length) * 100));
        } else {
          clearInterval(interval);
          setActivePlaylistId(resultData.playlistId);
          setActivePlaylistUrl(resultData.playlistUrl);

          setConvertedResult({
            playlistUrl: resultData.playlistUrl,
            summary: resultData.summary
          });

          // Update original scanned playlist track list with final statuses
          setScannedPlaylist((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              tracks: prev.tracks.map((t) => {
                const match = resultData.tracks?.find((rt: any) => rt.id === t.id);
                if (match) {
                  return {
                    ...t,
                    status: match.status,
                    spotifyUri: match.spotifyUri
                  };
                }
                return t;
              })
            };
          });

          // Uncheck successfully matched tracks, keep failed tracks selected for retry
          setSelectedTracks((prev) => {
            const nextSel = { ...prev };
            resultData.tracks?.forEach((track: any) => {
              if (track.status === "matched") {
                nextSel[track.id] = false;
              } else {
                nextSel[track.id] = true;
              }
            });
            return nextSel;
          });

          setIsConverting(false);
          addToast("Playlist transfer completed successfully!", "success");
        }
      }, 300);

    } catch (err) {
      setIsConverting(false);
      addToast("Connection error during transfer.", "error");
    }
  };

  // Helper callback ref to inject javascript: bookmarklet URL directly into DOM to bypass React security filters
  const setBookmarkletHref = (node: HTMLAnchorElement | null) => {
    if (node) {
      const origin = window.location.origin;
      node.setAttribute("href", "javascript:(function(){const panel=document.querySelector('#items.playlist-panel-video-list')||document.querySelector('ytd-playlist-panel-renderer #items');const items=document.querySelectorAll('ytd-playlist-panel-video-renderer');if(!items||items.length===0){alert('BetterSync: No songs found on screen. Make sure you are on a YouTube watch/Mix page with the playlist queue panel visible!');return;}const list=Array.from(items).map(item=>{const titleText=item.querySelector('#video-title')?.innerText?.trim();const artistText=item.querySelector('#byline')?.innerText?.trim()||item.querySelector('#byline-container')?.innerText?.trim();const img=item.querySelector('img');const thumb=img?img.src:'';return titleText?{title:titleText,artist:artistText||'Unknown Artist',thumbnail:thumb}:null;}).filter(Boolean);const targetHost='" + origin + "';window.location.replace(targetHost+'/?import='+encodeURIComponent(JSON.stringify(list)));})();");
    }
  };

  return (
    <div style={{ position: "relative", zIndex: 10 }}>
      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type} animate-fade`}>
            {t.type === "success" && <CheckCircle2 size={16} className="text-spotify-green" />}
            {t.type === "error" && <XCircle size={16} className="text-youtube-red" />}
            {t.type === "info" && <Sparkle size={16} className="text-accent-violet" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header Sticky Navbar */}
      <header>
        <div className="header-container">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              background: "var(--accent-gradient)",
              padding: "0.5rem",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Spotify size={20} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.03em" }}>
              Better<span style={{ color: "var(--accent-violet)" }}>Sync</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <a href="#workspace" style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Workspace</a>
            <a href="#features" style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Features</a>
            <a href="#pricing" style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Donate</a>
            
            <span className="badge badge-interactive" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-violet)" }}></span>
              Live Connection
            </span>
          </div>
        </div>
      </header>
 
      {/* Main Container */}
      <main>
        {/* Hero Section */}
        <section style={{ textAlign: "center", marginBottom: "5rem", marginTop: "2rem" }}>
          <div style={{ display: "inline-flex", marginBottom: "1.5rem" }}>
            <span className="badge badge-interactive" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Zap size={12} />
              V1.0.0 Real-Time Sync Active
            </span>
          </div>
          <h1 style={{ 
            fontSize: "clamp(2.5rem, 5vw, 4rem)", 
            maxWidth: "800px", 
            margin: "0 auto 1.5rem", 
            background: "linear-gradient(to right, #ffffff, #a1a1aa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.04em"
          }}>
            Convert YouTube Playlists <br />
            To Spotify, Instantly.
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: "600px", margin: "0 auto 2.5rem", lineHeight: 1.6 }}>
            Connect to Spotify and YouTube using your active browser login sessions. Paste any URL to scan, filter, and sync playlists instantly in the background.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            <a href="#workspace" className="btn btn-glow">
              Get Started
              <ArrowRight size={16} />
            </a>
            <a href="#pricing" className="btn btn-secondary">
              Support Project
            </a>
          </div>
        </section>

        {/* Workspace Conversion Section */}
        <section id="workspace" style={{ marginBottom: "6rem", scrollMarginTop: "100px" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Converter Workspace</h2>
            <p style={{ color: "var(--text-secondary)" }}>Link accounts and initiate the transfer</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
            {/* Step 1: Authentication Connections */}
            <div className="card card-glow animate-fade" style={{ background: "rgba(9, 9, 11, 0.8)", backdropFilter: "blur(20px)" }}>
              <h3 style={{ fontSize: "1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ display: "inline-flex", background: "rgba(255,255,255,0.05)", padding: "0.35rem", borderRadius: "6px" }}><Database size={16} /></span>
                1. Provider Connections
              </h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                
                {/* YouTube Connection */}
                <div style={{ 
                  border: "1px solid var(--border-color)", 
                  borderRadius: "12px", 
                  padding: "1.5rem", 
                  background: isYoutubeConnected ? "rgba(255, 0, 0, 0.03)" : "rgba(255,255,255,0.01)",
                  borderColor: isYoutubeConnected ? "rgba(255, 0, 0, 0.2)" : "var(--border-color)",
                  transition: "var(--transition-smooth)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background: "rgba(255, 0, 0, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <Youtube size={20} color="var(--youtube-red)" />
                      </div>
                      <div>
                        <h4 style={{ fontSize: "1rem" }}>YouTube</h4>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Google OAuth</span>
                      </div>
                    </div>
                    {isYoutubeConnected ? (
                      <span className="badge" style={{ borderColor: "rgba(255, 0, 0, 0.2)", color: "#ff4d4d" }}>Connected</span>
                    ) : (
                      <span className="badge" style={{ color: "var(--text-muted)" }}>Disconnected</span>
                    )}
                  </div>
                  
                  {isYoutubeConnected && youtubeProfile ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.02)", padding: "0.75rem", borderRadius: "8px" }}>
                      <img src={youtubeProfile.avatar} alt="YT Avatar" style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
                      <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{youtubeProfile.name}</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                      Log in to extract playlist track names from your YouTube profile settings.
                    </p>
                  )}

                  <button 
                    onClick={handleConnectYoutube}
                    className={`btn ${isYoutubeConnected ? "btn-secondary" : "btn-youtube"}`}
                    style={{ width: "100%" }}
                  >
                    <Youtube size={16} />
                    {isYoutubeConnected ? "Sign Out (YouTube)" : "Connect YouTube Account"}
                  </button>
                </div>

                {/* Spotify Connection */}
                <div style={{ 
                  border: "1px solid var(--border-color)", 
                  borderRadius: "12px", 
                  padding: "1.5rem", 
                  background: isSpotifyConnected ? "rgba(29, 185, 84, 0.03)" : "rgba(255,255,255,0.01)",
                  borderColor: isSpotifyConnected ? "rgba(29, 185, 84, 0.2)" : "var(--border-color)",
                  transition: "var(--transition-smooth)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background: "rgba(29, 185, 84, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <Spotify size={20} color="var(--spotify-green)" />
                      </div>
                      <div>
                        <h4 style={{ fontSize: "1rem" }}>Spotify</h4>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Spotify API</span>
                      </div>
                    </div>
                    {isSpotifyConnected ? (
                      <span className="badge" style={{ borderColor: "rgba(29, 185, 84, 0.2)", color: "#1db954" }}>Connected</span>
                    ) : (
                      <span className="badge" style={{ color: "var(--text-muted)" }}>Disconnected</span>
                    )}
                  </div>
                  
                  {isSpotifyConnected && spotifyProfile ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.02)", padding: "0.75rem", borderRadius: "8px" }}>
                      <img src={spotifyProfile.avatar} alt="Spotify Avatar" style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
                      <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{spotifyProfile.name}</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                      Log in to Spotify to automatically query Spotify database tracks and add to playlists.
                    </p>
                  )}

                  <button 
                    onClick={handleConnectSpotify}
                    className={`btn ${isSpotifyConnected ? "btn-secondary" : "btn-spotify"}`}
                    style={{ width: "100%" }}
                  >
                    <Spotify size={16} />
                    {isSpotifyConnected ? "Sign Out (Spotify)" : "Connect Spotify Account"}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Converter Panel */}
            <div style={{ position: "relative" }}>
              {/* Blur Cover when not authenticated */}
              {(!isYoutubeConnected || !isSpotifyConnected) && (
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 20,
                  backdropFilter: "blur(6px)",
                  background: "rgba(3, 3, 3, 0.6)",
                  borderRadius: "16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border-color)"
                }}>
                  <div style={{
                    background: "var(--panel-bg)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                    padding: "2rem",
                    textAlign: "center",
                    maxWidth: "400px",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.8)"
                  }}>
                    <Lock size={28} className="text-accent-violet" style={{ margin: "0 auto 1rem" }} />
                    <h4 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Workspace Locked</h4>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                      Log in to both Google (YouTube) and Spotify above to open the transfer workspace.
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                      <button onClick={handleConnectYoutube} className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}>
                        <Youtube size={12} color="var(--youtube-red)" /> Connect YouTube
                      </button>
                      <button onClick={handleConnectSpotify} className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}>
                        <Spotify size={12} color="var(--spotify-green)" /> Connect Spotify
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="card" style={{ opacity: (!isYoutubeConnected || !isSpotifyConnected) ? 0.3 : 1, transition: "var(--transition-smooth)" }}>
                <h3 style={{ fontSize: "1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ display: "inline-flex", background: "rgba(255,255,255,0.05)", padding: "0.35rem", borderRadius: "6px" }}><Sparkles size={16} /></span>
                  2. Playlist Extraction & Transfer
                </h3>
                {/* Tab selectors */}
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  <button 
                    onClick={() => setImportMode("url")} 
                    style={{ 
                      background: "none", 
                      border: "none", 
                      color: importMode === "url" ? "var(--accent-violet)" : "var(--text-secondary)", 
                      fontWeight: importMode === "url" ? 600 : 400,
                      borderBottom: importMode === "url" ? "2px solid var(--accent-violet)" : "none",
                      paddingBottom: "0.5rem",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      transition: "var(--transition-smooth)"
                    }}
                  >
                    YouTube Link
                  </button>
                  <button 
                    onClick={() => setImportMode("text")} 
                    style={{ 
                      background: "none", 
                      border: "none", 
                      color: importMode === "text" ? "var(--accent-violet)" : "var(--text-secondary)", 
                      fontWeight: importMode === "text" ? 600 : 400,
                      borderBottom: importMode === "text" ? "2px solid var(--accent-violet)" : "none",
                      paddingBottom: "0.5rem",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      transition: "var(--transition-smooth)"
                    }}
                  >
                    Text List Import
                  </button>
                </div>

                {importMode === "url" ? (
                  <div style={{ marginBottom: "2rem" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: 500 }}>
                      Enter YouTube Video, Playlist or Mix URL
                    </label>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <input 
                        type="text" 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://www.youtube.com/playlist?list=PL6NDKXsPL0_IaXF5H4XJgHti_ip-tNsqt" 
                        className="form-input"
                        disabled={isScanning || isConverting}
                      />
                      {(url.includes("list=RD") || url.includes("list=LM")) ? (
                        <button 
                          onClick={handleAutomateMixCapture}
                          disabled={isScanning || isConverting}
                          className="btn btn-glow"
                          style={{ flexShrink: 0, background: "var(--accent-gradient)" }}
                        >
                          ⚡ Automate Mix
                        </button>
                      ) : (
                        <button 
                          onClick={handleScanPlaylist}
                          disabled={isScanning || isConverting}
                          className="btn btn-glow"
                          style={{ flexShrink: 0 }}
                        >
                          {isScanning ? (
                            <>
                              <Loader2 size={16} className="loading-spinner" />
                              Scanning...
                            </>
                          ) : (
                            "Scan Playlist"
                          )}
                        </button>
                      )}
                    </div>

                    {(url.includes("list=RD") || url.includes("list=LM")) && (
                      <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--text-secondary)", background: "rgba(139, 92, 246, 0.05)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(139, 92, 246, 0.2)", lineHeight: 1.5 }}>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem", color: "var(--accent-violet)", fontWeight: 700 }}>
                          <span>⚡</span>
                          <span>YouTube Mix Scraper (Bookmarklet Method)</span>
                        </div>
                        <div>
                          YouTube Mixes are generated dynamically in your browser session. To automatically capture all tracks with zero manual typing, use our custom bookmarklet:
                          
                          <ol style={{ paddingLeft: "1.2rem", marginTop: "0.5rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                            <li>
                              Ensure your browser's Bookmarks Bar is visible (press <code>Ctrl+Shift+B</code> or <code>Cmd+Shift+B</code>).
                            </li>
                            <li>
                              <strong>Drag and drop</strong> the purple button below directly onto your Bookmarks Bar.
                            </li>
                            <li>
                              Click the grey <strong>Launch YouTube Mix</strong> button to open your Mix page.
                            </li>
                            <li>
                              While on the YouTube Mix page, click the <strong>Sync to BetterSync</strong> bookmark on your Bookmarks Bar. The page will auto-scroll, read your tracks, and load them directly into this dashboard!
                            </li>
                          </ol>

                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                            {/* Draggable bookmarklet link */}
                            <a 
                              ref={setBookmarkletHref}
                              className="btn btn-glow" 
                              style={{ 
                                fontSize: "0.75rem", 
                                padding: "0.35rem 0.75rem", 
                                display: "inline-flex", 
                                gap: "0.25rem", 
                                width: "auto", 
                                height: "auto",
                                border: "1px dashed var(--accent-violet)",
                                cursor: "grab"
                              }}
                              onClick={(e) => {
                                alert("Sync to BetterSync Bookmarklet:\n\nDrag this button directly to your browser's Bookmarks Bar.\n\nThen, when you are watching your YouTube Mix, click it in your bookmarks bar to sync the tracks!");
                              }}
                            >
                              ⭐ Sync to BetterSync
                            </a>

                            <button 
                              onClick={handleAutomateMixCapture}
                              className="btn btn-secondary"
                              style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem", height: "auto" }}
                            >
                              ⚡ Launch YouTube Mix
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Presets */}
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginRight: "0.25rem" }}>Quick Test Public Playlists:</span>
                      <button onClick={() => loadPreset("lofi")} className="badge nav-link" style={{ cursor: "pointer", border: "1px dashed var(--border-color)" }}>🎵 Lofi Study Beats</button>
                      <button onClick={() => loadPreset("synthwave")} className="badge nav-link" style={{ cursor: "pointer", border: "1px dashed var(--border-color)" }}>⚡ Synthwave Retro</button>
                      <button onClick={() => loadPreset("acoustic")} className="badge nav-link" style={{ cursor: "pointer", border: "1px dashed var(--border-color)" }}>🎸 Acoustic Cozy</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: 500 }}>
                        Paste Tracks List (one song per line, format: <code>Song - Artist</code>)
                      </label>
                      <textarea 
                        value={textList}
                        onChange={(e) => setTextList(e.target.value)}
                        placeholder="Centuries - Fall Out Boy&#10;Glitter & Gold - Barns Courtney&#10;Radioactive - Imagine Dragons" 
                        className="form-input"
                        rows={5}
                        style={{ fontFamily: "inherit", resize: "vertical", minHeight: "120px" }}
                        disabled={isScanning || isConverting}
                      />
                    </div>
                    
                    <button 
                      onClick={handleImportTextList}
                      disabled={isScanning || isConverting}
                      className="btn btn-glow"
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      Import Track List
                    </button>

                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", background: "rgba(255,255,255,0.01)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-color)", lineHeight: 1.5 }}>
                      💡 <strong>1-Click YouTube Mix Sync (Bookmarklet Method)</strong>
                      <div style={{ marginTop: "0.5rem" }}>
                        Instead of manual copy-pasting, you can automate track imports directly from YouTube using our browser bookmarklet:
                        
                        <ol style={{ paddingLeft: "1.2rem", marginTop: "0.5rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                          <li>
                            Ensure your browser's Bookmarks Bar is visible (press <code>Ctrl+Shift+B</code> or <code>Cmd+Shift+B</code>).
                          </li>
                          <li>
                            <strong>Drag and drop</strong> this button onto your Bookmarks Bar:
                            <div style={{ marginTop: "0.35rem" }}>
                              <a 
                                ref={setBookmarkletHref}
                                className="btn btn-glow" 
                                style={{ 
                                  fontSize: "0.75rem", 
                                  padding: "0.35rem 0.75rem", 
                                  display: "inline-flex", 
                                  gap: "0.25rem", 
                                  width: "auto", 
                                  height: "auto",
                                  border: "1px dashed var(--accent-violet)",
                                  cursor: "grab"
                                }}
                                onClick={(e) => {
                                  alert("Sync to BetterSync Bookmarklet:\n\nDrag this button directly to your browser's Bookmarks Bar.\n\nThen, when you are watching your YouTube Mix, click it in your bookmarks bar to sync the tracks!");
                                }}
                              >
                                ⭐ Sync to BetterSync
                              </a>
                            </div>
                          </li>
                          <li>
                            Open your YouTube Mix page, and click the **Sync to BetterSync** bookmark you just added. The page will auto-scroll, read your tracks, and automatically reload them in this dashboard!
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {/* SKELETON LOADER SCREEN */}
                {isScanning && (
                  <div style={{ border: "1px dashed var(--border-color)", borderRadius: "12px", padding: "2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
                      <div style={{ width: "80px", height: "80px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)", animation: "pulse-glow 1.5s infinite" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: "20px", width: "40%", background: "rgba(255,255,255,0.02)", borderRadius: "4px", marginBottom: "0.5rem", position: "relative", overflow: "hidden" }}>
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)", animation: "pulse-glow 1.5s infinite" }} />
                        </div>
                        <div style={{ height: "14px", width: "20%", background: "rgba(255,255,255,0.02)", borderRadius: "4px", position: "relative", overflow: "hidden" }}>
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)", animation: "pulse-glow 1.5s infinite" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PLAYLIST TRACKLIST VIEW */}
                {scannedPlaylist && !isScanning && !isConverting && (
                  <div className="animate-fade" style={{ border: "1px solid var(--border-color)", borderRadius: "12px", padding: "1.5rem" }}>
                    
                    <div style={{ display: "flex", gap: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1.5rem", marginBottom: "1.5rem", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
                        <img src={scannedPlaylist.youtubeInfo.thumbnail} alt="Cover" style={{ width: "70px", height: "70px", borderRadius: "8px", objectFit: "cover" }} />
                        <div>
                          <h4 style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>{scannedPlaylist.playlistName}</h4>
                          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            Channel: <span style={{ color: "var(--text-primary)" }}>{scannedPlaylist.youtubeInfo.channel}</span> • Scraped Tracks: <span style={{ color: "var(--text-primary)" }}>{scannedPlaylist.totalTracks}</span>
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setScannedPlaylist(null);
                          setConvertedResult(null);
                          setActivePlaylistId(null);
                          setActivePlaylistUrl(null);
                        }} 
                        className="btn btn-secondary" 
                        style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", height: "auto" }}
                      >
                        Clear & Scan New
                      </button>
                    </div>

                    {/* Converted Results Status Banner */}
                    {convertedResult && (
                      <div style={{ 
                        border: "1px solid var(--border-color)", 
                        borderRadius: "8px", 
                        padding: "1rem", 
                        background: "rgba(255,255,255,0.01)", 
                        marginBottom: "1.5rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                          <div>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--spotify-green)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <CheckCircle2 size={14} /> Sync Summary
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                              Transferred {convertedResult.summary.transferred} / {convertedResult.summary.total} songs ({convertedResult.summary.accuracy}% match accuracy)
                            </span>
                          </div>
                          <a href={convertedResult.playlistUrl} target="_blank" rel="noopener noreferrer" className="btn btn-glow" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", height: "auto" }}>
                            <ExternalLink size={12} /> Open on Spotify
                          </a>
                        </div>
                        {convertedResult.summary.failed > 0 && (
                          <div style={{ fontSize: "0.75rem", color: "var(--youtube-red)", background: "rgba(255,75,75,0.05)", padding: "0.5rem 0.75rem", borderRadius: "6px" }}>
                            ⚠️ {convertedResult.summary.failed} tracks failed to sync. Review the list below and click "Retry Sync" to match them using our fuzzy fallbacks!
                          </div>
                        )}
                      </div>
                    )}

                    {!activePlaylistId && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: 500 }}>
                          Create Target Spotify Playlist Name
                        </label>
                        <input 
                          type="text" 
                          value={targetPlaylistName}
                          onChange={(e) => setTargetPlaylistName(e.target.value)}
                          className="form-input"
                        />
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-color)", marginBottom: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      <button onClick={toggleAllTracks} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Play size={12} /> Toggle Selection
                      </button>
                      <span>Tracks Selected: {Object.values(selectedTracks).filter(Boolean).length} / {scannedPlaylist.tracks.length}</span>
                    </div>

                    <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {scannedPlaylist.tracks.map((track) => (
                        <div 
                          key={track.id} 
                          onClick={() => toggleTrack(track.id)}
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "space-between", 
                            padding: "0.65rem 0.85rem", 
                            borderRadius: "8px", 
                            background: selectedTracks[track.id] ? "rgba(255,255,255,0.02)" : "transparent",
                            cursor: "pointer",
                            transition: "var(--transition-smooth)"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ color: selectedTracks[track.id] ? "var(--accent-violet)" : "var(--text-muted)", display: "flex", alignItems: "center" }}>
                              {selectedTracks[track.id] ? <CheckCircle2 size={16} /> : <XCircle size={16} style={{ opacity: 0.3 }} />}
                            </div>
                            <img src={track.thumbnail} alt="Song" style={{ width: "32px", height: "32px", borderRadius: "4px", objectFit: "cover" }} />
                            <div>
                              <span style={{ fontSize: "0.9rem", fontWeight: 500, display: "block" }}>{track.title}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{track.artist}</span>
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {track.status === "matched" && (
                              <span style={{ fontSize: "0.7rem", color: "var(--spotify-green)", border: "1px solid var(--spotify-green)", padding: "0.15rem 0.35rem", borderRadius: "4px", fontWeight: 500 }}>
                                ✓ matched
                              </span>
                            )}
                            {track.status === "failed" && (
                              <span style={{ fontSize: "0.7rem", color: "var(--youtube-red)", border: "1px solid var(--youtube-red)", padding: "0.15rem 0.35rem", borderRadius: "4px", fontWeight: 500 }}>
                                ✕ no match
                              </span>
                            )}
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{track.duration}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {convertedResult && convertedResult.summary.failed === 0 ? (
                      <button 
                        onClick={() => {
                          setScannedPlaylist(null);
                          setConvertedResult(null);
                          setActivePlaylistId(null);
                          setActivePlaylistUrl(null);
                          setUrl("");
                        }}
                        className="btn btn-glow"
                        style={{ width: "100%", marginTop: "1.5rem" }}
                      >
                        <Play size={16} fill="white" />
                        Transfer Another Playlist
                      </button>
                    ) : (
                      <button 
                        onClick={handleStartSync}
                        className="btn btn-glow"
                        style={{ width: "100%", marginTop: "1.5rem" }}
                      >
                        <Play size={16} fill="white" />
                        {activePlaylistId ? `Retry Sync (${Object.values(selectedTracks).filter(Boolean).length} Selected Tracks)` : "Sync Tracks directly to Spotify Account"}
                      </button>
                    )}
                  </div>
                )}

                {/* TRANSFER PROGRESS SYNC */}
                {isConverting && (
                  <div className="animate-fade" style={{ border: "1px solid var(--border-color)", borderRadius: "12px", padding: "2rem" }}>
                    <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                      <h4 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Syncing Tracks...</h4>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        Searching and adding tracks into Spotify playlist <strong style={{ color: "var(--text-primary)" }}>{targetPlaylistName}</strong>
                      </p>
                      
                      <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.03)", borderRadius: "9999px", overflow: "hidden", margin: "1.5rem 0 0.5rem" }}>
                        <div style={{ width: `${conversionProgress}%`, height: "100%", background: "var(--accent-gradient)", transition: "width 0.2s ease" }}></div>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--accent-violet)" }}>{conversionProgress}% Completed</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "250px", overflowY: "auto" }}>
                      {conversionTracks.map((track) => (
                        <div key={track.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.01)", borderRadius: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {track.status === "pending" && <Loader2 size={14} className="loading-spinner text-accent-violet" />}
                            {track.status === "matched" && <CheckCircle2 size={14} className="text-spotify-green" />}
                            {track.status === "failed" && <XCircle size={14} className="text-youtube-red" />}
                            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{track.title}</span>
                          </div>
                          
                          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                            {track.status === "pending" && <span style={{ color: "var(--text-muted)" }}>searching...</span>}
                            {track.status === "matched" && <span style={{ color: "var(--spotify-green)" }}>✓ matched</span>}
                            {track.status === "failed" && <span style={{ color: "var(--youtube-red)" }}>✕ no match</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


              </div>
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" style={{ marginBottom: "6rem", scrollMarginTop: "100px" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Transfer Mechanics</h2>
            <p style={{ color: "var(--text-secondary)" }}>Built for full speed and absolute accuracy</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
            <div className="card">
              <div style={{ color: "var(--accent-violet)", marginBottom: "1rem" }}><Zap size={24} /></div>
              <h4 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Unlimited transfers</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Sync massive track collections without video count constraints or artificial playlist size caps.
              </p>
            </div>
            
            <div className="card">
              <div style={{ color: "var(--accent-violet)", marginBottom: "1rem" }}><Layers size={24} /></div>
              <h4 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Multiple parallel transfers</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Convert several YouTube playlist streams simultaneously with multi-threaded matching.
              </p>
            </div>

            <div className="card">
              <div style={{ color: "var(--accent-violet)", marginBottom: "1rem" }}><Clock size={24} /></div>
              <h4 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Background processing</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Leave the website securely. The transfer continues running in Node.js server background tasks.
              </p>
            </div>

            <div className="card">
              <div style={{ color: "var(--accent-violet)", marginBottom: "1rem" }}><Spotify size={24} /></div>
              <h4 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Radio & Mix playlists</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Full extraction compatibility for dynamic YouTube-generated music streams, mixers, and radios.
              </p>
            </div>
          </div>
        </section>

        {/* Support & Donations Section (Buy Me a Coffee) */}
        <section id="pricing" style={{ marginBottom: "6rem", scrollMarginTop: "100px" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "2.25rem", marginBottom: "0.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Support BetterSync</h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto", fontSize: "1rem", lineHeight: 1.6 }}>
              BetterSync is 100% free and open-source. If it helped you sync your playlists and saved you time, consider supporting the developer by buying a coffee!
            </p>
          </div>

          <div className="card card-glow animate-fade" style={{ 
            maxWidth: "600px", 
            margin: "0 auto", 
            padding: "2.5rem 2rem", 
            textAlign: "center",
            background: "rgba(9, 9, 11, 0.6)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)"
          }}>
            <div style={{ display: "inline-flex", background: "rgba(139, 92, 246, 0.1)", padding: "1rem", borderRadius: "50%", marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "2.5rem", lineHeight: 1 }}>☕</span>
            </div>
            
            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Buy Me a Coffee</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
              Secure payment supported globally via Stripe or instantly in India via Google Pay / UPI.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              {/* Stripe */}
              <a 
                href={process.env.NEXT_PUBLIC_STRIPE_COFFEE_URL || "https://buy.stripe.com/7sIbKB2e1fXk0eY4gg"} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-glow"
                style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  padding: "1.25rem", 
                  height: "auto", 
                  gap: "0.5rem",
                  textDecoration: "none",
                  borderRadius: "12px",
                  background: "var(--accent-gradient)"
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>💳</span>
                <span style={{ fontWeight: 600 }}>Pay with Stripe</span>
                <span style={{ fontSize: "0.75rem", opacity: 0.8, fontWeight: 400 }}>Credit Card / Apple Pay</span>
              </a>

              {/* UPI */}
              <button 
                onClick={() => setShowUpiModal(true)}
                className="btn btn-secondary"
                style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  padding: "1.25rem", 
                  height: "auto", 
                  gap: "0.5rem",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                  background: "rgba(255,255,255,0.01)"
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>🇮🇳</span>
                <span style={{ fontWeight: 600 }}>Google Pay / UPI</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>Scan QR or Pay Direct</span>
              </button>
            </div>
          </div>
        </section>

        {/* UPI QR Code Modal Overlay */}
        {showUpiModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            padding: "1rem"
          }}>
            <div className="card card-glow animate-fade" style={{
              maxWidth: "400px",
              width: "100%",
              textAlign: "center",
              padding: "2.5rem 2rem",
              position: "relative",
              background: "#08080c",
              border: "1px solid var(--border-color)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)"
            }}>
              <button 
                onClick={() => setShowUpiModal(false)}
                style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "1.5rem",
                  lineHeight: 1
                }}
              >
                ✕
              </button>

              <div style={{ display: "inline-flex", background: "rgba(29, 185, 84, 0.1)", padding: "0.75rem", borderRadius: "50%", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>⚡</span>
              </div>

              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Scan & Pay via UPI</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.4 }}>
                Scan this QR code with Google Pay, PhonePe, Paytm, or BHIM to send support.
              </p>

              <div style={{
                background: "white",
                padding: "1rem",
                borderRadius: "12px",
                display: "inline-block",
                marginBottom: "1rem",
                boxShadow: "0 4px 30px rgba(0,0,0,0.3)",
                border: "2px solid rgba(255,255,255,0.1)"
              }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${process.env.NEXT_PUBLIC_UPI_ID || "deepuonthemove@okaxis"}&pn=BetterSync&cu=INR&tn=Support%20BetterSync`)}`} 
                  alt="UPI QR Code" 
                  style={{ width: "200px", height: "200px", display: "block" }} 
                />
              </div>

              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                UPI ID: <strong style={{ color: "var(--text-primary)" }}>{process.env.NEXT_PUBLIC_UPI_ID || "deepuonthemove@okaxis"}</strong>
              </div>

              {/* Mobile Deep Link Button */}
              <a 
                href={`upi://pay?pa=${process.env.NEXT_PUBLIC_UPI_ID || "deepuonthemove@okaxis"}&pn=BetterSync&cu=INR&tn=Support%20BetterSync`}
                className="btn btn-glow"
                style={{ width: "100%", textDecoration: "none", justifyContent: "center" }}
              >
                Open UPI App directly
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border-color)", padding: "3rem 1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
        <p style={{ marginBottom: "0.5rem" }}>BetterSync © 2026. Made with Better Auth, Next.js & Supabase.</p>
        <p style={{ fontSize: "0.75rem" }}>YouTube and Spotify are trademarks of their respective owners. This is an independent utility.</p>
      </footer>
    </div>
  );
}
