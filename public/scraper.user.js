// ==UserScript==
// @name         BetterSync YouTube Mix Scraper
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Automatically scrapes YouTube Mixes and redirects back to BetterSync with zero user intervention
// @author       BetterSync
// @match        *://*.youtube.com/watch*
// @match        *://youtube.com/watch*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    console.log("[BetterSync] Scraper Userscript injected on: " + window.location.href);

    // Check if the watch page has the BetterSync automation trigger
    if (window.location.href.includes("bettersync=true")) {
        console.log("[BetterSync] Automation query parameter detected! Initializing scraper...");

        let attempts = 0;
        const checker = setInterval(async () => {
            attempts++;
            try {
                const panel = document.querySelector('#items.playlist-panel-video-list') || document.querySelector('ytd-playlist-panel-renderer #items');
                const items = document.querySelectorAll('ytd-playlist-panel-video-renderer');
                
                console.log(`[BetterSync] Attempt ${attempts}: found ${items ? items.length : 0} playlist tracks on screen.`);

                if (items && items.length > 0) {
                    clearInterval(checker);
                    console.log("[BetterSync] Playlist items found! Auto-scrolling to trigger lazy loading...");

                    // Scroll the panel if possible to load more items
                    if (panel) {
                        panel.scrollTo(0, panel.scrollHeight);
                        await new Promise(r => setTimeout(r, 1000));
                        panel.scrollTo(0, panel.scrollHeight);
                        await new Promise(r => setTimeout(r, 1000));
                    }

                    const finalItems = document.querySelectorAll('ytd-playlist-panel-video-renderer');
                    console.log(`[BetterSync] Scraping final list of ${finalItems.length} tracks...`);

                    const tracks = Array.from(finalItems).map(item => {
                        const titleText = item.querySelector('#video-title')?.innerText?.trim();
                        const artistText = item.querySelector('#byline')?.innerText?.trim() || item.querySelector('#byline-container')?.innerText?.trim();
                        const img = item.querySelector('img');
                        const thumb = img ? img.src : '';
                        return titleText ? { 
                            title: titleText, 
                            artist: artistText || 'Unknown Artist', 
                            thumbnail: thumb 
                        } : null;
                    }).filter(Boolean);

                    if (tracks.length > 0) {
                        // Dynamically use the opener's origin or current window host
                        const targetHost = window.location.origin;
                        const redirectUrl = targetHost + "/?import=" + encodeURIComponent(JSON.stringify(tracks));
                        
                        console.log(`[BetterSync] Successfully parsed ${tracks.length} tracks. Redirecting to: ${redirectUrl}`);
                        window.location.replace(redirectUrl);
                    } else {
                        console.error("[BetterSync] Tracks array compiled empty.");
                    }
                }
            } catch (err) {
                console.error("[BetterSync] Scraper interval exception:", err);
            }

            // Timeout after 15 seconds to prevent infinite loops
            if (attempts > 15) {
                clearInterval(checker);
                console.warn("[BetterSync] Scraper timed out waiting for YouTube playlist items to render.");
            }
        }, 1000);
    }
})();
