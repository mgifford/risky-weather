/**
 * Climate Action Tracker Module
 * Displays country-specific climate target ratings
 */

const CAT = (() => {
    // Mapping of country names (from ipwho.is) to CAT slugs
    const COUNTRY_MAP = {
        'Argentina': 'argentina',
        'Australia': 'australia',
        'Brazil': 'brazil',
        'Canada': 'canada',
        'Chile': 'chile',
        'China': 'china',
        'Colombia': 'colombia',
        'Costa Rica': 'costa-rica',
        'Egypt': 'egypt',
        'Ethiopia': 'ethiopia',
        'European Union': 'eu',
        'Gambia': 'gambia',
        'Germany': 'germany',
        'India': 'india',
        'Indonesia': 'indonesia',
        'Iran': 'iran',
        'Japan': 'japan',
        'Kazakhstan': 'kazakhstan',
        'Kenya': 'kenya',
        'Mexico': 'mexico',
        'Morocco': 'morocco',
        'Nepal': 'nepal',
        'New Zealand': 'new-zealand',
        'Nigeria': 'nigeria',
        'Norway': 'norway',
        'Peru': 'peru',
        'Philippines': 'philippines',
        'Russia': 'russian-federation',
        'Saudi Arabia': 'saudi-arabia',
        'Singapore': 'singapore',
        'South Africa': 'south-africa',
        'South Korea': 'south-korea',
        'Switzerland': 'switzerland',
        'Thailand': 'thailand',
        'Turkey': 'turkey',
        'Ukraine': 'ukraine',
        'United Arab Emirates': 'uae',
        'United Kingdom': 'uk',
        'United States': 'usa',
        'Vietnam': 'vietnam'
    };

    function getCatUrl(countryName) {
        if (!countryName) return 'https://climateactiontracker.org/';
        
        // Try exact match
        if (COUNTRY_MAP[countryName]) {
            return `https://climateactiontracker.org/countries/${COUNTRY_MAP[countryName]}/`;
        }

        // Try case-insensitive match
        const lowerName = countryName.toLowerCase();
        const key = Object.keys(COUNTRY_MAP).find(k => k.toLowerCase() === lowerName);
        if (key) {
            return `https://climateactiontracker.org/countries/${COUNTRY_MAP[key]}/`;
        }

        // Fallback to main countries page
        return 'https://climateactiontracker.org/countries/';
    }

    // CORS Proxies
    const PROXIES = [
        "https://api.allorigins.win/raw?url=",
        "https://api.codetabs.com/v1/proxy?quest="
    ];

    async function fetchRating(url) {
        for (const proxy of PROXIES) {
            try {
                const response = await fetch(proxy + encodeURIComponent(url));
                if (!response.ok) continue;
                const text = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, "text/html");
                
                // Strategy 1: Look for the specific rating structure
                // Usually "Overall rating" is followed by the rating text
                // We look for elements containing "Overall rating"
                const allElements = doc.querySelectorAll('*');
                for (const el of allElements) {
                    if (el.textContent.trim().includes('Overall rating')) {
                        // The rating is often in the next element or the same parent's text
                        // Let's try to find the rating text which is usually uppercase
                        const parentText = el.parentElement ? el.parentElement.textContent : el.textContent;
                        const cleanText = parentText.replace(/\s+/g, ' ').trim();
                        
                        // Look for known ratings
                        const ratings = [
                            'CRITICALLY INSUFFICIENT',
                            'HIGHLY INSUFFICIENT',
                            'INSUFFICIENT',
                            'ALMOST SUFFICIENT',
                            '1.5°C COMPATIBLE'
                        ];
                        
                        for (const r of ratings) {
                            if (cleanText.toUpperCase().includes(r)) {
                                return r; // Return the found rating
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn(`CAT fetch failed via ${proxy}`, e);
            }
        }
        return null;
    }

    function getRatingColor(rating) {
        if (!rating) return 'var(--subtext)';
        const r = rating.toUpperCase();
        if (r.includes('CRITICALLY')) return '#000000'; // Black/Grey
        if (r.includes('HIGHLY INSUFFICIENT')) return '#c53030'; // Red
        if (r.includes('INSUFFICIENT')) return '#c05621'; // Dark Orange (AA Compliant)
        if (r.includes('ALMOST')) return '#975a16'; // Dark Gold (AA Compliant)
        if (r.includes('COMPATIBLE')) return '#276749'; // Dark Green (AA Compliant)
        return '#657286';
    }

    async function render(containerId, countryName) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const url = getCatUrl(countryName);
        const displayCountry = countryName || "Global";
        const isSpecificCountry = countryName && (getCatUrl(countryName) !== 'https://climateactiontracker.org/countries/');

        let message = `See how countries are meeting their climate targets.`;
        if (isSpecificCountry) {
            message = `How is <strong>${displayCountry}</strong> doing on climate targets?`;
        }

        container.innerHTML = `
            <div class="card-title">
                <h2 style="margin:0;">Climate Action Tracker</h2>
            </div>
            <div style="text-align: center; padding: 20px 0;">
                <div class="cat-message" style="font-size: 1.1rem; margin-bottom: 15px;">
                    ${message}
                </div>
                
                ${isSpecificCountry ? `
                <div id="cat-rating-container" style="margin-bottom: 15px; min-height: 30px;">
                    <span class="muted" style="font-size: 0.9rem;">Loading rating...</span>
                </div>
                ` : ''}

                <a href="${url}" target="_blank" style="
                    display: inline-block;
                    background-color: var(--highlight);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 6px;
                    text-decoration: none;
                    font-weight: 600;
                    transition: background-color 0.2s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                " onmouseover="this.style.backgroundColor=getComputedStyle(document.documentElement).getPropertyValue('--highlight-strong') || getComputedStyle(document.documentElement).getPropertyValue('--highlight')" onmouseout="this.style.backgroundColor=getComputedStyle(document.documentElement).getPropertyValue('--highlight')">
                    View Full Analysis
                </a>
                <div style="margin-top: 15px; font-size: 0.85rem; color: #657286;">
                    Source: Climate Action Tracker
                </div>
            </div>
        `;

        if (isSpecificCountry) {
            const rating = await fetchRating(url);
            const ratingContainer = container.querySelector('#cat-rating-container');
            if (ratingContainer) {
                if (rating) {
                    // Map rating text to a CSS class so styles (including dark-mode overrides)
                    // control the color rather than inline styles which are hard to override.
                    const cls = (function(r) {
                        const utf = r.toUpperCase();
                        if (utf.includes('CRITICALLY')) return 'critically';
                        if (utf.includes('HIGHLY')) return 'highly';
                        if (utf.includes('INSUFFICIENT')) return 'insufficient';
                        if (utf.includes('ALMOST')) return 'almost';
                        if (utf.includes('COMPATIBLE')) return 'compatible';
                        return 'unknown';
                    })(rating);

                    ratingContainer.innerHTML = `
                        <div class="cat-rating ${cls}">
                            ${rating}
                        </div>
                    `;
                } else {
                    ratingContainer.innerHTML = `
                        <span class="muted" style="font-size: 0.9rem;">Rating not available</span>
                    `;
                }
            }
        }
    }

    return { render };
})();
