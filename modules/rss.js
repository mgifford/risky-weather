/**
 * RSS Module
 * Fetches and displays climate news from various RSS feeds
 * Uses a CORS proxy to fetch feeds client-side
 */

const RSS = (() => {
    // List of available feeds
    const FEEDS = [
        { name: "Covering Climate Now", url: "https://coveringclimatenow.org/feed/" },
        { name: "Society of Environmental Journalists", url: "https://www.sej.org/rss.xml" },
        { name: "Washington Post Climate", url: "https://feeds.washingtonpost.com/rss/climate-environment" },
        { name: "BBC Science & Environment", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml" },
        { name: "The Daily Climate", url: "https://www.dailyclimate.org/feeds/feed.rss" },
        { name: "The Guardian Climate Crisis", url: "https://www.theguardian.com/environment/climate-crisis/rss" },
        { name: "The Economist Climate Change", url: "https://www.economist.com/climate-change/rss.xml" }
    ];

    // CORS Proxies to bypass browser restrictions
    const PROXIES = [
        "https://api.allorigins.win/raw?url=",
        "https://api.codetabs.com/v1/proxy?quest="
    ];

    /**
     * Fetch and parse an RSS feed with fallback
     */
    async function fetchFeed(feedUrl) {
        for (const proxy of PROXIES) {
            try {
                const response = await fetch(proxy + encodeURIComponent(feedUrl));
                if (!response.ok) throw new Error(`Proxy ${proxy} returned ${response.status}`);
                const text = await response.text();
                const parser = new DOMParser();
                const xml = parser.parseFromString(text, "text/xml");
                // Check if parsing failed (some browsers return an error document)
                if (xml.querySelector("parsererror")) throw new Error("XML parsing failed");
                return xml;
            } catch (error) {
                console.warn(`Error fetching RSS feed via ${proxy}:`, error);
                // Continue to next proxy
            }
        }
        console.error("All RSS fetch attempts failed.");
        return null;
    }

    /**
     * Extract items from parsed XML
     */
    function parseItems(xml, limit = 3) {
        const items = [];
        const entries = xml.querySelectorAll("item");
        
        for (let i = 0; i < Math.min(entries.length, limit); i++) {
            const entry = entries[i];
            const title = entry.querySelector("title")?.textContent || "No Title";
            const link = entry.querySelector("link")?.textContent || "#";
            const pubDate = entry.querySelector("pubDate")?.textContent || "";
            
            // Clean up date
            let dateStr = "";
            if (pubDate) {
                try {
                    dateStr = new Date(pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                } catch (e) {}
            }

            items.push({ title, link, date: dateStr });
        }
        return items;
    }

    /**
     * Render the RSS section
     */
    async function render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Pick a random feed
        const feedConfig = FEEDS[Math.floor(Math.random() * FEEDS.length)];

        // Initial Loading State
        container.innerHTML = `
            <div class="card-title">
                <h2 style="margin:0;">📰 Climate News</h2>
                <span style="font-size: 0.8rem; color: var(--subtext); font-weight: normal;">via ${feedConfig.name}</span>
            </div>
            <div id="rss-content" style="min-height: 100px; display: flex; align-items: center; justify-content: center;">
                <span style="color: var(--subtext);">Loading news...</span>
            </div>
        `;

        const xml = await fetchFeed(feedConfig.url);
        const contentDiv = container.querySelector('#rss-content');

        if (!xml) {
            contentDiv.innerHTML = `<div style="text-align: center; color: var(--accent);">Unable to load news feed.</div>`;
            return;
        }

        const items = parseItems(xml);
        
        if (items.length === 0) {
            contentDiv.innerHTML = `<div style="text-align: center; color: var(--subtext);">No recent news found.</div>`;
            return;
        }

        let html = `<ul style="list-style: none; padding: 0; margin: 0;">`;
        items.forEach(item => {
            html += `
                <li style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #edf2f7;">
                    <a href="${item.link}" target="_blank" style="text-decoration: none; color: var(--text); font-weight: 600; display: block; margin-bottom: 4px;">
                        ${item.title}
                    </a>
                    <div style="font-size: 0.75rem; color: var(--subtext);">
                        ${item.date} • <a href="${item.link}" target="_blank" style="color: var(--highlight);">Read more &rarr;</a>
                    </div>
                </li>
            `;
        });
        html += `</ul>`;
        
        // Add "More from source" link
        html += `
            <div style="text-align: right; margin-top: 10px; font-size: 0.8rem;">
                <a href="${feedConfig.url.replace('/feed/', '').replace('/rss.xml', '')}" target="_blank" style="color: var(--highlight); text-decoration: underline;">
                    More from ${feedConfig.name}
                </a>
            </div>
        `;

        contentDiv.style.display = 'block';
        contentDiv.innerHTML = html;
    }

    return {
        render
    };
})();
