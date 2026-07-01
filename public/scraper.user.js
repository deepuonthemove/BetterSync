// ==UserScript==
// @name         BetterSync YouTube Mix Scraper
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Automatically scrapes YouTube Mixes and redirects back to BetterSync with zero user intervention
// @author       BetterSync
// @match        https://*.youtube.com/watch*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    // Check if the watch page has the BetterSync automation trigger
    if (window.location.href.includes("bettersync=true")) {
        console.log("[BetterSync] Automation triggered. Scrape operation started...");

        // Wait for the elements to load on screen
        const checker = setInterval(async () => {
            const panel = document.querySelector('#items.playlist-panel-video-list');
            const items = document.querySelectorAll('ytd-playlist-panel-video-renderer');
            
            if (items && items.length > 0) {
                clearInterval(checker);
                console.log("[BetterSync] Playlist items detected. Auto-scrolling to capture lazy-loaded tracks...");

                // Auto-scroll the sidebar container twice to fetch lazy loaded songs
                if (panel) {
                    panel.scrollTo(0, panel.scrollHeight);
                    await new Promise(r => setTimeout(r, 800));
                    panel.scrollTo(0, panel.scrollHeight);
                    await new Promise(r => setTimeout(r, 800));
                }

                const finalItems = document.querySelectorAll('ytd-playlist-panel-video-renderer');
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
                    console.log(`[BetterSync] Successfully scraped ${tracks.length} tracks. Redirecting back...`);
                    
                    // Determine redirect base url dynamically
                    const host = window.location.origin;

                    const redirectUrl = host + "/?import=" + encodeURIComponent(JSON.stringify(tracks));
                    
                    // Replace the location so the user stays in the same tab flow
                    window.location.replace(redirectUrl);
                } else {
                    console.error("[BetterSync] Scrape failed: Tracks array compiled empty.");
                }
            }
        }, 1000);
    }
})();
