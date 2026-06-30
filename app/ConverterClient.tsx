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
            name: session?.user.name || "YouTube User",
            avatar: session?.user.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
          });
        } else {
          setYoutubeProfile(null);
        }

        if (hasSpotify) {
          setSpotifyProfile({
            name: session?.user.name || "Spotify User",
            avatar: session?.user.image || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=80&h=80&q=80"
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
    } catch (err) {
      addToast("Connection error while scanning.", "error");
    } finally {
      setIsScanning(false);
    }
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
          tracks: tracksToSync
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
          setConversionTracks((prev) => {
            const copy = [...prev];
            const resultTrack = resultData.tracks[currentIndex];
            copy[currentIndex] = {
              ...copy[currentIndex],
              status: resultTrack.status,
              spotifyUri: resultTrack.spotifyUri
            };
            return copy;
          });

          currentIndex++;
          setConversionProgress(Math.round((currentIndex / initialTracks.length) * 100));
        } else {
          clearInterval(interval);
          setConvertedResult({
            playlistUrl: resultData.playlistUrl,
            summary: resultData.summary
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
            <a href="#pricing" style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Pricing</a>
            
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
              Upgrade
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

                {/* URL Paste input */}
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
                  </div>
                  
                  {/* Presets */}
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginRight: "0.25rem" }}>Quick Test Public Playlists:</span>
                    <button onClick={() => loadPreset("lofi")} className="badge nav-link" style={{ cursor: "pointer", border: "1px dashed var(--border-color)" }}>🎵 Lofi Study Beats</button>
                    <button onClick={() => loadPreset("synthwave")} className="badge nav-link" style={{ cursor: "pointer", border: "1px dashed var(--border-color)" }}>⚡ Synthwave Retro</button>
                    <button onClick={() => loadPreset("acoustic")} className="badge nav-link" style={{ cursor: "pointer", border: "1px dashed var(--border-color)" }}>🎸 Acoustic Cozy</button>
                  </div>
                </div>

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
                {scannedPlaylist && !isScanning && !isConverting && !convertedResult && (
                  <div className="animate-fade" style={{ border: "1px solid var(--border-color)", borderRadius: "12px", padding: "1.5rem" }}>
                    
                    <div style={{ display: "flex", gap: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1.5rem", marginBottom: "1.5rem", alignItems: "center" }}>
                      <img src={scannedPlaylist.youtubeInfo.thumbnail} alt="Cover" style={{ width: "70px", height: "70px", borderRadius: "8px", objectFit: "cover" }} />
                      <div>
                        <h4 style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>{scannedPlaylist.playlistName}</h4>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          Channel: <span style={{ color: "var(--text-primary)" }}>{scannedPlaylist.youtubeInfo.channel}</span> • Scraped Tracks: <span style={{ color: "var(--text-primary)" }}>{scannedPlaylist.totalTracks}</span>
                        </p>
                      </div>
                    </div>

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
                            <div style={{ color: selectedTracks[track.id] ? "var(--accent-violet)" : "var(--text-muted)" }}>
                              {selectedTracks[track.id] ? <CheckCircle2 size={16} /> : <XCircle size={16} style={{ opacity: 0.3 }} />}
                            </div>
                            <img src={track.thumbnail} alt="Song" style={{ width: "32px", height: "32px", borderRadius: "4px", objectFit: "cover" }} />
                            <div>
                              <span style={{ fontSize: "0.9rem", fontWeight: 500, display: "block" }}>{track.title}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{track.artist}</span>
                            </div>
                          </div>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{track.duration}</span>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={handleStartSync}
                      className="btn btn-glow"
                      style={{ width: "100%", marginTop: "1.5rem" }}
                    >
                      <Play size={16} fill="white" />
                      Sync Tracks directly to Spotify Account
                    </button>
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

                {/* TRANSFER SUCCESS SCREEN */}
                {convertedResult && !isConverting && (
                  <div className="animate-fade" style={{ border: "1px solid var(--border-color)", borderRadius: "12px", padding: "2rem", textAlign: "center" }}>
                    <div style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      background: "rgba(29, 185, 84, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1.5rem"
                    }}>
                      <CheckCircle2 size={36} color="var(--spotify-green)" />
                    </div>

                    <h3 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Sync Successful!</h3>
                    <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                      Created Spotify playlist <strong style={{ color: "var(--text-primary)" }}>{targetPlaylistName}</strong>.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", border: "1px solid var(--border-color)", padding: "1rem", borderRadius: "12px", background: "rgba(255,255,255,0.01)", marginBottom: "2rem" }}>
                      <div>
                        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>TOTAL</span>
                        <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>{convertedResult.summary.total}</span>
                      </div>
                      <div>
                        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>SYNCED</span>
                        <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--spotify-green)" }}>{convertedResult.summary.transferred}</span>
                      </div>
                      <div>
                        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>FAILED</span>
                        <span style={{ fontSize: "1.25rem", fontWeight: 700, color: convertedResult.summary.failed > 0 ? "var(--youtube-red)" : "var(--text-primary)" }}>{convertedResult.summary.failed}</span>
                      </div>
                      <div>
                        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>ACCURACY</span>
                        <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent-violet)" }}>{convertedResult.summary.accuracy}%</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                      <a href={convertedResult.playlistUrl} target="_blank" rel="noopener noreferrer" className="btn btn-glow">
                        <ExternalLink size={16} />
                        Open on Spotify
                      </a>
                      <button onClick={() => setConvertedResult(null)} className="btn btn-secondary">
                        Transfer Another Playlist
                      </button>
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

        {/* Pricing Section */}
        <section id="pricing" style={{ marginBottom: "6rem", scrollMarginTop: "100px" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Simple, Fair Pricing</h2>
            <p style={{ color: "var(--text-secondary)" }}>Choose the scope that suits your library size</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
            
            {/* Card 1: Free */}
            <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Free Sandbox</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Test drive the pipeline</p>
                <div style={{ marginBottom: "1.5rem" }}>
                  <span style={{ fontSize: "2.5rem", fontWeight: 800 }}>$0</span>
                  <span style={{ color: "var(--text-muted)" }}>/forever</span>
                </div>
                
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
                  <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Check size={16} className="text-spotify-green" /> Max 5 tracks per transfer</li>
                  <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Check size={16} className="text-spotify-green" /> Single playlist transfers</li>
                  <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Check size={16} className="text-spotify-green" /> Basic YouTube URL matching</li>
                </ul>
              </div>
              
              <button onClick={() => addToast("Current Sandbox active.", "info")} className="btn btn-secondary" style={{ width: "100%" }}>
                Current Plan
              </button>
            </div>

            {/* Card 2: 30-Days Access */}
            <div className="card card-glow" style={{ 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "space-between",
              border: "1px solid rgba(139, 92, 246, 0.4)",
              boxShadow: "0 0 30px rgba(139, 92, 246, 0.08)"
            }}>
              <span className="badge badge-interactive" style={{ position: "absolute", top: "1rem", right: "1rem" }}>Most Popular</span>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>30-Days Full Access</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>One-time payment unlock</p>
                <div style={{ marginBottom: "1.5rem" }}>
                  <span style={{ fontSize: "2.5rem", fontWeight: 800 }}>$11.99</span>
                  <span style={{ color: "var(--text-muted)" }}>/one-time</span>
                </div>

                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
                  <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Check size={16} className="text-spotify-green" /> <strong>Unlimited transfers</strong> — no video cap</li>
                  <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Check size={16} className="text-spotify-green" /> <strong>Multiple parallel transfers</strong></li>
                  <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Check size={16} className="text-spotify-green" /> <strong>Background processing</strong></li>
                  <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Check size={16} className="text-spotify-green" /> Radio & Mix stream transfers</li>
                  <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Check size={16} className="text-spotify-green" /> 30 days full premium access</li>
                  <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Check size={16} className="text-spotify-green" /> 7-day money-back guarantee</li>
                </ul>
              </div>

              <button 
                onClick={() => addToast("Redirecting to checkout panel...", "info")}
                className="btn btn-glow" 
                style={{ width: "100%" }}
              >
                Unlock Pro Access
              </button>
            </div>

            {/* Card 3: Lifetime Pass */}
            <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Lifetime Pass</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Permanent developer license</p>
                <div style={{ marginBottom: "1.5rem" }}>
                  <span style={{ fontSize: "2.5rem", fontWeight: 800 }}>$29.99</span>
                  <span style={{ color: "var(--text-muted)" }}>/lifetime</span>
                </div>

                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
                  <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Check size={16} className="text-spotify-green" /> <strong>Everything in 30-Days Plan</strong></li>
                  <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Check size={16} className="text-spotify-green" /> Permanent access, no expiration</li>
                  <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Check size={16} className="text-spotify-green" /> Future platform integration updates</li>
                  <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Check size={16} className="text-spotify-green" /> Priority developer support line</li>
                </ul>
              </div>

              <button 
                onClick={() => addToast("Redirecting to licensing options...", "info")}
                className="btn btn-secondary" 
                style={{ width: "100%" }}
              >
                Purchase Lifetime License
              </button>
            </div>
            
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border-color)", padding: "3rem 1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
        <p style={{ marginBottom: "0.5rem" }}>BetterSync © 2026. Made with Better Auth, Next.js & Supabase.</p>
        <p style={{ fontSize: "0.75rem" }}>YouTube and Spotify are trademarks of their respective owners. This is an independent utility.</p>
      </footer>
    </div>
  );
}
