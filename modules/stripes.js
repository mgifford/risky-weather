/**
 * Stripes Module
 * Handles the Warming Stripes visualization
 */

const Stripes = (() => {
    /**
     * Render the Stripes section
     */
    function render(containerId, lat, lon) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Initial HTML structure
        container.innerHTML = `
            <div class="card-title"><h2 style="margin:0;" data-i18n="ui.climateContext">🌍 Climate Context</h2></div>
            <p style="font-size: 0.9rem; color: var(--text);" data-i18n="stripes.description">Annual temperature deviation (1950-2023). <br><strong>Blue</strong> = Cooler than normal. <strong>Red</strong> = Warmer.</p>
            <div id="stripes-viz" class="stripes-wrap"></div>
            <div class="legend"><span data-i18n="stripes.start">1950</span><span data-i18n="stripes.end">2023</span></div>
            <button id="load-stripes-btn" class="secondary-btn" style="margin-top: 10px;">Load Stripes</button>
        `;

        const loadBtn = document.getElementById('load-stripes-btn');
        const stripesViz = document.getElementById('stripes-viz');

        // Check for lowdata mode
        const params = new URLSearchParams(window.location.search);
        const lowdata = params.get('lowdata') === '1';

        if (loadBtn) {
            loadBtn.addEventListener('click', async () => {
                loadBtn.disabled = true;
                loadBtn.innerText = 'Loading...';
                
                try {
                    const years = await API.fetchHistoricalYears(lat, lon, 1950, 2023);
                    if (years && !years.rateLimited) {
                        // Aggregate annual means
                        const temps = years.daily?.temperature_2m_mean || [];
                        const dates = years.daily?.time || [];
                        const yearly = {};
                        
                        dates.forEach((d, i) => {
                            const y = d.slice(0,4);
                            const t = temps[i];
                            if (t != null) {
                                if (!yearly[y]) yearly[y] = { sum: 0, count: 0 };
                                yearly[y].sum += t;
                                yearly[y].count++;
                            }
                        });

                        const annualMeans = Object.keys(yearly).sort().map(y => ({ 
                            year: y, 
                            mean: yearly[y].sum / yearly[y].count 
                        }));

                        // Baseline 1971-2000
                        const baselineVals = annualMeans
                            .filter(a => a.year >= '1971' && a.year <= '2000')
                            .map(a => a.mean);
                        
                        const baseline = baselineVals.length ? 
                            (baselineVals.reduce((a,b)=>a+b,0)/baselineVals.length) : 0;

                        renderViz(stripesViz, annualMeans, baseline);
                        loadBtn.style.display = 'none';
                    } else {
                        loadBtn.innerText = 'Error / Rate Limited';
                        loadBtn.disabled = false;
                    }
                } catch (e) {
                    console.error(e);
                    loadBtn.innerText = 'Error loading data';
                    loadBtn.disabled = false;
                }
            });
        }

        // Auto-load if not lowdata
        if (!lowdata && loadBtn) {
            // Small delay to allow UI to settle
            setTimeout(() => loadBtn.click(), 100);
        }
    }

    /**
     * Render the stripes bars
     */
    function renderViz(container, annualMeans, baseline) {
        container.innerHTML = '';
        if (!annualMeans || annualMeans.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--subtext); padding: 10px;">No historical data available</div>';
            return;
        }

        annualMeans.forEach(item => {
            const delta = item.mean - baseline;
            const stripe = document.createElement('div');
            stripe.className = 'stripe';
            stripe.style.backgroundColor = Calculations.getStripeColor(delta);
            stripe.title = `${item.year}: ${delta > 0 ? '+' : ''}${delta.toFixed(2)}°C`;
            container.appendChild(stripe);
        });
    }

    return {
        render
    };
})();
