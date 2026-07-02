# Product Requirement Document (PRD): BetterSync

BetterSync is a web application designed to seamlessly bridge the gap between YouTube and Spotify, allowing music fans to convert and sync public YouTube playlists, video watch pages, and dynamically generated YouTube Mixes directly to their Spotify account.

---

## 1. Product Overview & Core Goals

### The Problem
*   Many music listeners discover tracks, DJ mixes, and lofi sessions on YouTube.
*   Moving these tracks to a dedicated listening platform like Spotify is a tedious, manual process of searching and copying one-by-one.
*   YouTube Mixes (`list=RD...`) are personalized browser-session items that Google's official API does not expose, making automated server-to-server syncing of mixes impossible through standard endpoints.

### The Solution: BetterSync
*   **A seamless converter**: Authenticate with Google (YouTube) and Spotify using OAuth to manage playlists.
*   **Dual-Scraping Engine**: A client-side bookmarklet to capture logged-in browser watch sessions (Mixes), coupled with a resilient server-side HTML parser that recursively extracts tracks from public YouTube playlist URLs.
*   **High-Accuracy Search Cascade**: Matches misspelled or modified YouTube titles on Spotify using strict, fuzzy, and title-cleaning search passes.

---

## 2. Target Audience & Platform Support

1.  **Desktop Audiophiles**: Listening to music while working, who want to capture dynamic YouTube Mixes in one click.
2.  **Mobile Music Discoverers**: Discovering music on the YouTube mobile app, wanting to copy and paste public playlist links directly.

---

## 3. System Architecture & Tech Stack

*   **Framework**: Next.js 16 (App Router, Turbopack, TailwindCSS/Vanilla CSS).
*   **Authentication**: [Better Auth](https://www.better-auth.com/) managing Google and Spotify accounts.
*   **Database**: Supabase PostgreSQL (Production) / SQLite (Development) to store linked Spotify OAuth access tokens.
*   **Scraping Strategy**:
    *   *Standard Playlists*: Serverless static HTML parsing.
    *   *Watch Mixes*: Client-side DOM-scraping bookmarklet redirecting payload to BetterSync.
*   **Error Monitoring & Telemetry**: Sentry SDK (`@sentry/nextjs`) capturing client React crashes, serverless API errors, and custom performance metrics.

---

## 4. Key Functional Features

### A. Stepper Wizard for Mix Automation
Guiding users through mix capture with interactive animations:
1.  **Step 1: Save Bookmarklet**: Drag and drop the **Sync to BetterSync** bookmarklet to the browser bookmarks bar.
2.  **Step 2: Load Mix**: Paste the YouTube Mix URL and click **"Follow instructions below"**.
3.  **Step 3: Open YouTube**: Opens the target YouTube watch page in a new browser tab.
4.  **Step 4: Click Sync**: User clicks the bookmarklet in their bookmarks bar on the YouTube tab. This extracts the active player track queue, redirects back to BetterSync, and loads the tracks.

### B. High-Accuracy Spotify Matching (Search Cascade)
To maximize matches, the matching worker executes a 3-step fall-through logic for each track:
1.  **Strict Search**: Query Spotify using `track:"TITLE" artist:"ARTIST"`.
2.  **Fuzzy Search**: Query Spotify using free-text string `"TITLE ARTIST"` to let Spotify's indexing handle misspelling/remixes.
3.  **Cleaned Search**: Strip extraneous text (e.g. `feat.`, `ft.`, `official video`, `lyrics`) and query using primary details.

### C. Playlist Scraping Resiliency
Resilient against YouTube UI changes:
*   Parses modern `lockupViewModel` layout schemas using JSON deep-traversal.
*   Falls back to legacy `playlistVideoRenderer` layout schemas automatically.

---

## 5. Monitoring & Analytics (Sentry Specification)

### Error Tracking
*   **Client Context**: Configured inside `sentry.client.config.ts`. Catching unhandled React exceptions.
*   **Serverless Context**: Configured inside `sentry.server.config.ts`. Explicit exception capturing via `Sentry.captureException` inside API catch blocks to catch swallowed HTTP 500 errors.

### Sentry Metrics
*   `playlist_scanned_success` / `playlist_scanned_failed`: Tracks client-side playlist scraping conversions.
*   `playlist_transferred_success` / `playlist_transferred_failed`: Tracks Spotify write successes.
*   `backend_scans_success` / `backend_scans_failed`: Logs server-side parse status.
*   `backend_transfers_success` / `backend_transfers_failed`: Logs Spotify sync operations.
*   `transfer_accuracy` / `backend_transfer_accuracy` (Distributions): Tracks matched track percentages.

---

## 6. Future Enhancements (V2 Roadmap)

1.  **Chrome/Firefox Browser Extension**: Replace the bookmarklet redirect flow with a browser background script to capture mix DOM tracks in one click without leaving the YouTube tab.
2.  **Mobile Mixes "Related Videos" Fallback**: If a user pastes a Mix link on mobile, parse YouTube's guest-served "Up Next" recommended videos to sync relevant music instantly without session cookies.
3.  **Real-Time Sync**: Add webhook poll listeners to automatically append tracks to Spotify as the user continues listening on YouTube.
