/**
 * UI Module
 * Handles all DOM manipulations and rendering
 */

const UI = (() => {
    const ELEMENTS = {
        location: document.getElementById('location-display'),
        ipDisplay: document.getElementById('ip-display'),
        storageDisplay: document.getElementById('storage-display'),
        labelA: document.getElementById('label-model-a'),
        valA: document.getElementById('val-model-a'),
        rainA: document.getElementById('rain-model-a'),
        labelB: document.getElementById('label-model-b'),
        valB: document.getElementById('val-model-b'),
        rainB: document.getElementById('rain-model-b'),
        colA: document.getElementById('col-a'),
        colB: document.getElementById('col-b'),
        headA: document.getElementById('head-model-a'),
        headB: document.getElementById('head-model-b'),
        linkPrimary: document.getElementById('link-primary'),
        forecastList: document.getElementById('forecast-list'),
        stripes: document.getElementById('stripes'),
        realityCheck: document.getElementById('reality-check'),
        realityContent: document.getElementById('reality-content'),
        winnerDisplay: document.getElementById('winner-display'),
        scoreboardSection: document.getElementById('scoreboard-section'),
        scoreA: document.getElementById('score-a'),
        scoreB: document.getElementById('score-b'),
        scoreLabelA: document.getElementById('score-label-a'),
        scoreLabelB: document.getElementById('score-label-b'),
        startDate: document.getElementById('start-date'),
        statusLog: document.getElementById('status-log'),
        resetBtn: document.getElementById('reset-btn'),
        lessonIcon: document.getElementById('lesson-icon'),
        lessonTitle: document.getElementById('lesson-title'),
        lessonContent: document.getElementById('lesson-content'),
        lessonCounter: document.getElementById('lesson-counter'),
        lessonCycleBtn: document.getElementById('lesson-cycle-btn'),
        languageToggleBtn: document.getElementById('language-toggle-btn'),
        shareBtn: document.getElementById('share-btn'),
        historySection: document.getElementById('history-section'),
        historyContent: document.getElementById('history-content'),
        citySearchInput: document.getElementById('city-search-input'),
        citySearchResults: document.getElementById('city-search-results'),
        historicalNormalsSection: document.getElementById('historical-normals-section'),
        historicalNormalsContent: document.getElementById('historical-normals-content'),
        srAnnouncer: document.getElementById('sr-announcer')
    };

    let currentLessonIndex = 0;
    let searchTimeout = null;

    return {
        /**
         * Announce message to screen readers
         */
        announce(message) {
            if (ELEMENTS.srAnnouncer) {
                ELEMENTS.srAnnouncer.textContent = message;
                // Clear it after a delay so the same message can be announced again if needed
                setTimeout(() => {
                    ELEMENTS.srAnnouncer.textContent = '';
                }, 3000);
            }
        },

        /**
         * Debug banner for almanac gating and status
         */
        renderDebugBanner(info) {
            const banner = document.createElement('div');
            banner.style.position = 'fixed';
            banner.style.bottom = '40px';
            banner.style.right = '10px';
            banner.style.background = 'rgba(0,0,0,0.6)';
            banner.style.color = '#fff';
            banner.style.padding = '6px 8px';
            banner.style.borderRadius = '6px';
            banner.style.fontSize = '0.75rem';
            banner.style.zIndex = '9999';
            const stText = info.station ? `${info.station.prov}:${info.station.name}${info.station.distanceKm ? ' ('+info.station.distanceKm+'km)' : ''}` : 'none';
            const locText = info.city ? `${info.city}` : 'unknown-city';
            const provText = info.provCode || '—';
            const coordsText = (info.lat != null && info.lon != null) ? `${Number(info.lat).toFixed(2)},${Number(info.lon).toFixed(2)}` : '?,?';
            banner.textContent = `CA:${info.isCanada ? 'Y' : 'N'} | LOC:${locText} [${coordsText}] | PROV:${provText} | ST:${stText} | AL:${info.almanac ? 'ok' : (info.almanacError || 'none')}`;
            document.body.appendChild(banner);
        },
        /**
         * Render ECCC Almanac card
         */
        renderECCCAlmanac(data, station) {
            if (!ELEMENTS.historicalNormalsSection || !ELEMENTS.historicalNormalsContent) return;
            const container = document.createElement('div');
            container.style.marginTop = '10px';
            container.style.padding = '10px';
            container.style.border = '1px solid #eee';
            container.style.borderRadius = '6px';
            const title = document.createElement('div');
            title.style.fontWeight = '600';
            title.style.marginBottom = '6px';
            title.textContent = I18n.t('ui.ecccAlmanacTitle');
            const stationEl = document.createElement('div');
            stationEl.style.fontSize = '0.85rem';
            stationEl.style.color = '#666';
            stationEl.textContent = `${station.name} (${station.prov})`;
            // Only render grid if we have almanac data
            let grid = null;
            if (data) {
                grid = document.createElement('div');
                grid.style.display = 'grid';
                grid.style.gridTemplateColumns = '1fr 1fr';
                grid.style.gap = '8px 12px';
                const avgHigh = document.createElement('div');
                avgHigh.textContent = `${I18n.t('ui.avgHigh')}: ${isNaN(data.avgHigh) ? '—' : Math.round(data.avgHigh)}°`;
                const avgLow = document.createElement('div');
                avgLow.textContent = `${I18n.t('ui.avgLow')}: ${isNaN(data.avgLow) ? '—' : Math.round(data.avgLow)}°`;
                const recHigh = document.createElement('div');
                recHigh.textContent = `${I18n.t('ui.recordHigh')}: ${isNaN(data.recHigh) ? '—' : Math.round(data.recHigh)}°`;
                const recLow = document.createElement('div');
                recLow.textContent = `${I18n.t('ui.recordLow')}: ${isNaN(data.recLow) ? '—' : Math.round(data.recLow)}°`;
                grid.appendChild(avgHigh);
                grid.appendChild(avgLow);
                grid.appendChild(recHigh);
                grid.appendChild(recLow);
            }
            const link = document.createElement('a');
            link.href = 'https://climate.weather.gc.ca/climate_data/almanac_selection_e.html';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.style.fontSize = '0.8rem';
            link.style.color = '#555';
            link.textContent = I18n.t('ui.sourceECCC');
            // Add direct links to today's station data pages when station id is available
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            const linkWrap = document.createElement('div');
            linkWrap.style.marginTop = '6px';
            linkWrap.style.display = 'flex';
            linkWrap.style.gap = '10px';
            const histLink = document.createElement('a');
            histLink.target = '_blank';
            histLink.rel = 'noopener noreferrer';
            histLink.style.fontSize = '0.8rem';
            histLink.style.color = '#555';
            histLink.textContent = I18n.t('ui.ecccHistoricalLink') || 'ECCC Historical Data (Today)';
            const almLink = document.createElement('a');
            almLink.target = '_blank';
            almLink.rel = 'noopener noreferrer';
            almLink.style.fontSize = '0.8rem';
            almLink.style.color = '#555';
            almLink.textContent = I18n.t('ui.ecccAlmanacLink') || 'ECCC Almanac';
            // Build URLs with stationId and date params when possible
            if (station && station.id) {
                // Common patterns used by ECCC; if parameters change, links still land on base page
                histLink.href = `https://climate.weather.gc.ca/historical_data/search_historic_data_e.html?stationID=${station.id}&year=${y}&month=${m}&day=${d}`;
                almLink.href = `https://climate.weather.gc.ca/climate_data/almanac_selection_e.html?stationID=${station.id}&year=${y}&month=${m}&day=${d}`;
            } else {
                histLink.href = 'https://climate.weather.gc.ca/historical_data/search_historic_data_e.html';
                almLink.href = 'https://climate.weather.gc.ca/climate_data/almanac_selection_e.html';
            }
            linkWrap.appendChild(histLink);
            linkWrap.appendChild(almLink);
            container.appendChild(title);
            container.appendChild(stationEl);
            if (grid) container.appendChild(grid);
            container.appendChild(link);
            container.appendChild(linkWrap);
            ELEMENTS.historicalNormalsContent.appendChild(container);
        },

        // GDACS integration removed.
        /**
         * Update location display
         */
        setLocation(city) {
            ELEMENTS.location.innerText = city;
        },

        /**
         * Display IP address
         */
        setIP(ip) {
            ELEMENTS.ipDisplay.innerText = ip || '—';
        },

        /**
         * Display storage information
         */
        setStorageInfo(hasLocation, hasHistory, hasScoreboard, historyCount = 0) {
            const items = [];
            if (hasLocation) items.push('Location');
            if (hasHistory) {
                items.push(historyCount > 1 ? `History (${historyCount} days)` : 'History');
            }
            if (hasScoreboard) items.push('Scores');
            
            const text = items.length > 0 ? items.join(', ') : 'Empty';
            ELEMENTS.storageDisplay.innerText = text;
        },

        /**
         * Update model labels and colors
         */
        setModelLabels(nameA, nameB, colorA, colorB) {
            ELEMENTS.labelA.innerText = nameA;
            ELEMENTS.labelB.innerText = nameB;
            ELEMENTS.headA.innerText = nameA;
            ELEMENTS.headB.innerText = nameB;
            ELEMENTS.scoreLabelA.innerText = nameA;
            ELEMENTS.scoreLabelB.innerText = nameB;
            ELEMENTS.colA.style.color = colorA;
            ELEMENTS.colB.style.color = colorB;
        },

        /**
         * Render today's forecast with uncertainty context
         */
        renderToday(data) {
            // Weather icons
            const iconA = Calculations.getWeatherIcon(data.codeA);
            const iconB = Calculations.getWeatherIcon(data.codeB);
            const descA = Calculations.getWeatherDescription(data.codeA);
            const descB = Calculations.getWeatherDescription(data.codeB);

            // Temperature with weather icon
            ELEMENTS.valA.innerHTML = `${iconA} ${Calculations.formatTemp(data.tempMaxA)}<span style="font-size: 0.7em; color: #666;">/${Calculations.formatTemp(data.tempMinA)}</span>`;
            ELEMENTS.valB.innerHTML = `${iconB} ${Calculations.formatTemp(data.tempMaxB)}<span style="font-size: 0.7em; color: #666;">/${Calculations.formatTemp(data.tempMinB)}</span>`;
            
            // Rain probability
            ELEMENTS.rainA.innerText = Calculations.formatRain(data.probA);
            ELEMENTS.rainB.innerText = Calculations.formatRain(data.probB);

            // Add tooltips for today's probabilities
            if (ELEMENTS.rainA) {
                ELEMENTS.rainA.title = Calculations.getProbabilityTooltip(data.probA);
                ELEMENTS.rainA.style.cursor = 'help';
            }
            if (ELEMENTS.rainB) {
                ELEMENTS.rainB.title = Calculations.getProbabilityTooltip(data.probB);
                ELEMENTS.rainB.style.cursor = 'help';
            }

            // Add weather details below temps (snow, wind)
            const detailsA = this.formatWeatherDetails(data.snowA, data.windA, data.gustA);
            const detailsB = this.formatWeatherDetails(data.snowB, data.windB, data.gustB);
            
            if (detailsA) {
                ELEMENTS.valA.innerHTML += `<div style="font-size: 0.75rem; color: #666; margin-top: 4px;">${detailsA}</div>`;
            }
            if (detailsB) {
                ELEMENTS.valB.innerHTML += `<div style="font-size: 0.75rem; color: #666; margin-top: 4px;">${detailsB}</div>`;
            }

            // Check for extreme weather warnings
            const extremeA = Calculations.getExtremeWeatherBadge(data.tempMaxA, data.tempMinA, data.windA, data.gustA, data.snowA);
            const extremeB = Calculations.getExtremeWeatherBadge(data.tempMaxB, data.tempMinB, data.windB, data.gustB, data.snowB);
            
            if (extremeA || extremeB) {
                const warningMsg = extremeA || extremeB;
                this.setStatus(`⚠️ ${warningMsg}`, 'warning');
            }

            // Calculate and display uncertainty for today if significant
            const tempDiff = Calculations.calculateDisagreement(data.tempMaxA, data.tempMaxB);
            const rainDiff = Calculations.calculateDisagreement(data.probA, data.probB);
            const uncertaintyLevel = Calculations.getUncertaintyLevel(tempDiff, rainDiff);
            
            if (uncertaintyLevel === 'high' && !extremeA && !extremeB) {
                const disagreementMsg = Calculations.getDisagreementTooltip(tempDiff, rainDiff);
                this.setStatus(`🤔 High uncertainty today: ${disagreementMsg}`);
            }
        },

        /**
         * Render 7-day forecast table with uncertainty indicators
         */
        renderSevenDay(dailyData, modelA, modelB) {
            const times = dailyData.time;
            let html = '';

            times.forEach((dateStr, index) => {
                const dayName = Calculations.getDayName(dateStr, index === 0);
                const maxA = Calculations.getSafeData(dailyData, modelA, 'temperature_2m_max', index);
                const minA = Calculations.getSafeData(dailyData, modelA, 'temperature_2m_min', index);
                const probA = Calculations.getSafeData(dailyData, modelA, 'precipitation_probability_max', index);
                const snowA = Calculations.getSafeData(dailyData, modelA, 'snowfall_sum', index);
                const windA = Calculations.getSafeData(dailyData, modelA, 'windspeed_10m_max', index);
                const gustA = Calculations.getSafeData(dailyData, modelA, 'windgusts_10m_max', index);
                const codeA = Calculations.getSafeData(dailyData, modelA, 'weather_code', index);
                
                const maxB = Calculations.getSafeData(dailyData, modelB, 'temperature_2m_max', index);
                const minB = Calculations.getSafeData(dailyData, modelB, 'temperature_2m_min', index);
                const probB = Calculations.getSafeData(dailyData, modelB, 'precipitation_probability_max', index);
                const snowB = Calculations.getSafeData(dailyData, modelB, 'snowfall_sum', index);
                const windB = Calculations.getSafeData(dailyData, modelB, 'windspeed_10m_max', index);
                const gustB = Calculations.getSafeData(dailyData, modelB, 'windgusts_10m_max', index);
                const codeB = Calculations.getSafeData(dailyData, modelB, 'weather_code', index);

                // Calculate disagreement
                const tempDiff = Calculations.calculateDisagreement(maxA, maxB);
                const rainDiff = Calculations.calculateDisagreement(probA, probB);
                const uncertaintyLevel = Calculations.getUncertaintyLevel(tempDiff, rainDiff);
                const uncertaintyIcon = Calculations.getUncertaintyIcon(uncertaintyLevel);
                const disagreementTooltip = Calculations.getDisagreementTooltip(tempDiff, rainDiff);

                // Weather icons
                const iconA = Calculations.getWeatherIcon(codeA);
                const iconB = Calculations.getWeatherIcon(codeB);

                // Format main data
                const cellA = Calculations.formatTableCell(probA, maxA, minA);
                const cellB = Calculations.formatTableCell(probB, maxB, minB);

                // Additional weather details (snow, wind)
                const detailsA = this.formatWeatherDetails(snowA, windA, gustA);
                const detailsB = this.formatWeatherDetails(snowB, windB, gustB);

                // Check for extreme weather
                const extremeA = Calculations.getExtremeWeatherBadge(maxA, minA, windA, gustA, snowA);
                const extremeB = Calculations.getExtremeWeatherBadge(maxB, minB, windB, gustB, snowB);
                const extremeBadge = extremeA ? `<div style="color: #d32f2f; font-size: 0.75rem; font-weight: bold; margin-top: 2px;">${extremeA}</div>` : '';

                // Add uncertainty indicator if present
                const uncertaintyBadge = uncertaintyIcon ? 
                    `<span class="uncertainty-badge" title="${disagreementTooltip}" style="cursor: help; margin-left: 4px;">${uncertaintyIcon}</span>` : '';

                html += `<tr>
                    <td class="col-day">${dayName}${uncertaintyBadge}${extremeBadge}</td>
                    <td title="${Calculations.getProbabilityTooltip(probA)}" style="cursor: help;">
                        <div>${iconA} ${cellA}</div>
                        ${detailsA ? `<div style="font-size: 0.75rem; color: #666; margin-top: 2px;">${detailsA}</div>` : ''}
                    </td>
                    <td title="${Calculations.getProbabilityTooltip(probB)}" style="cursor: help;">
                        <div>${iconB} ${cellB}</div>
                        ${detailsB ? `<div style="font-size: 0.75rem; color: #666; margin-top: 2px;">${detailsB}</div>` : ''}
                    </td>
                </tr>`;
            });

            ELEMENTS.forecastList.innerHTML = html;
        },

        formatWeatherDetails(snow, wind, gusts) {
            const parts = [];
            const snowText = Calculations.formatSnow(snow);
            const windText = Calculations.formatWind(wind, gusts);
            
            if (snowText) parts.push(`❄️ ${snowText}`);
            if (windText) parts.push(`💨 ${windText}`);
            
            return parts.join(' • ');
        },

        /**
         * Render warming stripes visualization
         */
        renderStripes(annualMeans, baseline) {
            if (!ELEMENTS.stripes) {
                console.warn('Stripes element not found');
                return;
            }
            
            ELEMENTS.stripes.innerHTML = '';

            if (!annualMeans || annualMeans.length === 0) {
                ELEMENTS.stripes.innerHTML = '<div style="text-align: center; color: #999; padding: 10px;">No historical data available</div>';
                return;
            }

            annualMeans.forEach(item => {
                const delta = item.mean - baseline;
                const stripe = document.createElement('div');
                stripe.className = 'stripe';
                stripe.style.backgroundColor = Calculations.getStripeColor(delta);
                stripe.title = Calculations.getStripeTooltip(item.year, delta);
                ELEMENTS.stripes.appendChild(stripe);
            });
        },

        /**
         * Render reality check (yesterday's forecast vs actual)
         */
        renderRealityCheck(date, actuallyRained, rainfall, modelAProbability, modelBProbability, modelAName, modelBName, tempData = null) {
            const rainLabel = actuallyRained ? `Rain (${rainfall.toFixed(1)}mm)` : 'Dry';

            let html = `
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Precipitation:</strong> ${rainLabel}</p>
                <p style="font-size:0.85rem; color:#555;">
                    ${modelAName} forecast: ${modelAProbability}% Risk<br>
                    ${modelBName} forecast: ${modelBProbability}% Risk
                </p>
            `;

            // Add temperature comparison if available
            if (tempData && tempData.actualTempMax !== null) {
                const formatTemp = (temp) => temp !== null ? `${Math.round(temp)}°C` : 'N/A';
                const calcError = (forecast, actual) => {
                    if (forecast === null || actual === null) return '';
                    const diff = forecast - actual;
                    const sign = diff > 0 ? '+' : '';
                    return ` (${sign}${diff.toFixed(1)}°C)`;
                };

                html += `
                    <p style="margin-top:12px;"><strong>Temperature:</strong></p>
                    <p style="font-size:0.85rem; color:#555;">
                        Actual High: <strong>${formatTemp(tempData.actualTempMax)}</strong>, 
                        Low: <strong>${formatTemp(tempData.actualTempMin)}</strong>
                    </p>
                    <p style="font-size:0.85rem; color:#555;">
                        ${modelAName}: ${formatTemp(tempData.forecastATempMax)}/${formatTemp(tempData.forecastATempMin)}${calcError(tempData.forecastATempMax, tempData.actualTempMax)}<br>
                        ${modelBName}: ${formatTemp(tempData.forecastBTempMax)}/${formatTemp(tempData.forecastBTempMin)}${calcError(tempData.forecastBTempMax, tempData.actualTempMax)}
                    </p>
                `;
            }

            ELEMENTS.realityContent.innerHTML = html;
            ELEMENTS.realityCheck.classList.remove('hidden');
        },

        /**
         * Show winner banner
         */
        showWinner(modelName) {
            ELEMENTS.winnerDisplay.innerHTML = `<div class="winner-banner">🏆 Winner: ${modelName}</div>`;
        },

        /**
         * Show draw result
         */
        showDraw() {
            ELEMENTS.winnerDisplay.innerHTML = `<div class="winner-banner" style="background:#edf2f7; color:#555;">🤝 Draw</div>`;
        },

        /**
         * Update scoreboard display
         */
        updateScoreboard(scoreA, scoreB, startDate) {
            ELEMENTS.scoreA.innerText = scoreA;
            ELEMENTS.scoreB.innerText = scoreB;
            ELEMENTS.startDate.innerText = startDate;

            if (scoreA > 0 || scoreB > 0) {
                ELEMENTS.scoreboardSection.classList.remove('hidden');
            }
        },

        /**
         * Set link(s) for official weather source
         * Supports multiple links (primary + secondary)
         */
        setOfficialLinks(linksArray) {
            const container = ELEMENTS.linkPrimary.parentElement;
            
            // Remove existing links
            const existing = container.querySelectorAll('.official-link');
            existing.forEach(link => link.remove());
            
            // Add new links
            linksArray.forEach((link, index) => {
                const a = document.createElement('a');
                a.className = 'official-link';
                a.href = link.href;
                a.target = '_blank';
                a.innerText = link.label + ' →';
                a.style.backgroundColor = link.color;
                a.style.marginTop = index > 0 ? '8px' : '15px';
                a.style.display = 'block';
                container.appendChild(a);
            });
        },

        /**
         * Set primary link (Environment Canada or alternative) - Legacy support
         */
        setPrimaryLink(href, label, backgroundColor) {
            ELEMENTS.linkPrimary.href = href;
            ELEMENTS.linkPrimary.innerText = label + ' \u2192';
            ELEMENTS.linkPrimary.style.backgroundColor = backgroundColor;
            ELEMENTS.linkPrimary.classList.remove('hidden');
        },

        /**
         * Display a lesson with title, icon, and content
         */
        displayLesson(lesson) {
            ELEMENTS.lessonIcon.innerText = lesson.icon;
            ELEMENTS.lessonTitle.innerText = lesson.title;
            ELEMENTS.lessonContent.innerText = lesson.content;
        },

        /**
         * Update lesson counter display
         */
        updateLessonCounter(current, total) {
            ELEMENTS.lessonCounter.innerText = `${current + 1} / ${total}`;
        },

        /**
         * Cycle to next lesson
         */
        nextLesson() {
            const total = Education.getLessonCount();
            currentLessonIndex = (currentLessonIndex + 1) % total;
            const lesson = Education.getLessonByIndex(currentLessonIndex);
            this.displayLesson(lesson);
            this.updateLessonCounter(currentLessonIndex, total);
        },

        /**
         * Initialize education section
         */
        async initEducation() {
            // Load lessons from YAML
            await Education.loadLessons();
            
            const lesson = Education.getRandomLesson();
            currentLessonIndex = 0;
            this.displayLesson(lesson);
            this.updateLessonCounter(0, Education.getLessonCount());
            
            // Set up cycle button
            ELEMENTS.lessonCycleBtn.addEventListener('click', () => this.nextLesson());
        },

        /**
         * Update status log
         */
        setStatus(message) {
            console.log(message);
            ELEMENTS.statusLog.innerText = `Status: ${message}`;
        },

        /**
         * Register reset button handler
         */
        onReset(callback) {
            ELEMENTS.resetBtn.addEventListener('click', callback);
        },

        /**
         * Register refresh location button handler
         */
        onRefreshLocation(callback) {
            const btn = document.getElementById('refresh-location-btn');
            if (btn) btn.addEventListener('click', callback);
        },

        /**
         * Show cache inspector modal
         */
        showCacheInspector() {
            const modal = document.getElementById('cache-modal');
            const content = document.getElementById('cache-content');
            
            // Collect all localStorage data (only weather app keys)
            const appKeyPrefixes = ['user_loc_v6', 'history_v6', 'scoreboard_v6', 'last_scored_date_v6'];
            const allKeys = Object.keys(localStorage).filter(key => 
                appKeyPrefixes.some(prefix => key.startsWith(prefix))
            );
            
            const cacheData = {
                location: JSON.parse(localStorage.getItem('user_loc_v6') || 'null'),
                historicalForecasts: JSON.parse(localStorage.getItem('history_v6') || 'null'),
                scoreboard: JSON.parse(localStorage.getItem('scoreboard_v6') || 'null'),
                lastScoredDate: localStorage.getItem('last_scored_date_v6'),
                allKeys: allKeys
            };
            
            // Format display
            let html = '<div style="margin-bottom: 20px;">';
            
            // Location
            html += '<div style="margin-bottom: 15px;"><strong>📍 Current Location:</strong></div>';
            html += '<div style="background: #f5f5f5; padding: 10px; border-radius: 6px; margin-bottom: 15px;">';
            if (cacheData.location) {
                html += `City: ${cacheData.location.city || 'N/A'}<br>`;
                html += `Lat: ${cacheData.location.lat || 'N/A'}<br>`;
                html += `Lon: ${cacheData.location.lon || 'N/A'}`;
                if (cacheData.location.ip) {
                    html += `<br>IP: ${cacheData.location.ip}`;
                }
            } else {
                html += 'No location saved';
            }
            html += '</div>';
            
            // Scoreboard
            html += '<div style="margin-bottom: 15px;"><strong>🏆 Model Scores:</strong></div>';
            html += '<div style="background: #f5f5f5; padding: 10px; border-radius: 6px; margin-bottom: 15px;">';
            if (cacheData.scoreboard && (cacheData.scoreboard.a > 0 || cacheData.scoreboard.b > 0)) {
                html += `Model A Wins: ${cacheData.scoreboard.a || 0}<br>`;
                html += `Model B Wins: ${cacheData.scoreboard.b || 0}<br>`;
                html += `Started: ${cacheData.scoreboard.start || 'N/A'}<br>`;
                html += `Last Scored: ${cacheData.lastScoredDate || 'Never'}`;
            } else {
                html += 'No scores saved yet';
            }
            html += '</div>';
            
            // Historical Forecasts
            html += '<div style="margin-bottom: 15px;"><strong>📅 Historical Forecasts (Last 31 Days):</strong></div>';
            html += '<div style="background: #f5f5f5; padding: 10px; border-radius: 6px; margin-bottom: 15px; max-height: 400px; overflow-y: auto;">';
            if (cacheData.historicalForecasts && Array.isArray(cacheData.historicalForecasts) && cacheData.historicalForecasts.length > 0) {
                // Filter out today's forecast - only show past dates
                const today = new Date().toISOString().split('T')[0];
                const pastForecasts = cacheData.historicalForecasts.filter(f => f.savedDate < today);
                
                if (pastForecasts.length === 0) {
                    html += '<div style="color: #718096; font-style: italic;">No past forecasts yet. Today\'s forecast will become historical tomorrow!</div>';
                } else {
                    html += `<div style="margin-bottom: 10px;"><strong>Past Forecasts: ${pastForecasts.length}</strong> (excludes today)</div>`;
                    pastForecasts.forEach((forecast, index) => {
                        const isYesterday = index === 0;
                        html += `<div style="padding: 8px; margin-bottom: 8px; background: ${isYesterday ? '#fff3cd' : 'white'}; border: 1px solid #ddd; border-radius: 4px;">`;
                        html += `<div style="font-weight: 600; margin-bottom: 4px;">${isYesterday ? '⏮️ ' : ''}${forecast.savedDate || 'N/A'}</div>`;
                    if (forecast.lat && forecast.lon) {
                        html += `<div style="font-size: 0.85rem; color: #666;">Location: ${forecast.lat.toFixed(2)}, ${forecast.lon.toFixed(2)}</div>`;
                    }
                    if (forecast.forecasts) {
                        const modelA = forecast.forecasts.modelA;
                        const modelB = forecast.forecasts.modelB;
                        if (modelA && modelA.days && modelA.days.length > 0) {
                            const day0 = modelA.days[0];
                            html += `<div style="font-size: 0.85rem; margin-top: 4px;">${modelA.name || 'Model A'}: ${day0.precip !== undefined ? day0.precip + '% rain' : 'N/A'}`;
                            if (day0.tempMax !== undefined || day0.tempMin !== undefined) {
                                html += ` | Temp: ${day0.tempMax !== undefined ? Math.round(day0.tempMax) : '?'}°/${day0.tempMin !== undefined ? Math.round(day0.tempMin) : '?'}°`;
                            }
                            html += `</div>`;
                        }
                        if (modelB && modelB.days && modelB.days.length > 0) {
                            const day0 = modelB.days[0];
                            html += `<div style="font-size: 0.85rem;">${modelB.name || 'Model B'}: ${day0.precip !== undefined ? day0.precip + '% rain' : 'N/A'}`;
                            if (day0.tempMax !== undefined || day0.tempMin !== undefined) {
                                html += ` | Temp: ${day0.tempMax !== undefined ? Math.round(day0.tempMax) : '?'}°/${day0.tempMin !== undefined ? Math.round(day0.tempMin) : '?'}°`;
                            }
                            html += `</div>`;
                        }
                    }
                        html += `</div>`;
                    });
                }
            } else if (cacheData.historicalForecasts && !Array.isArray(cacheData.historicalForecasts)) {
                // Old single-record format (backward compatibility)
                const forecast = cacheData.historicalForecasts;
                html += `<div style="padding: 8px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin-bottom: 8px;">`;
                html += `<div style="font-weight: 600; margin-bottom: 4px;">⚠️ Legacy Format (Single Record)</div>`;
                html += `Date: ${forecast.date || forecast.savedDate || 'N/A'}<br>`;
                html += `Location: ${forecast.lat && forecast.lon ? `${forecast.lat.toFixed(2)}, ${forecast.lon.toFixed(2)}` : 'N/A'}<br>`;
                html += `${forecast.modelA?.name || 'Model A'}: ${forecast.modelA?.prob !== undefined ? forecast.modelA.prob + '% rain' : 'N/A'}<br>`;
                html += `${forecast.modelB?.name || 'Model B'}: ${forecast.modelB?.prob !== undefined ? forecast.modelB.prob + '% rain' : 'N/A'}`;
                html += `</div>`;
                html += `<div style="margin-top: 8px; font-size: 0.85rem; color: #666;">Note: Revisit the page to migrate to new multi-day format.</div>`;
            } else {
                html += 'No historical forecasts stored yet. Will save on next visit.';
            }
            html += '</div>';
            
            // All localStorage Keys
            html += '<div style="margin-bottom: 15px;"><strong>🔑 All Stored Keys:</strong></div>';
            html += '<div style="background: #f5f5f5; padding: 10px; border-radius: 6px; margin-bottom: 15px; overflow-x: auto;">';
            if (cacheData.allKeys.length > 0) {
                const keyDescriptions = {
                    'user_loc_v6': 'Your saved location (city, lat/lon, IP)',
                    'history_v6': 'Up to 31 days of daily forecast snapshots',
                    'scoreboard_v6': 'Model battle wins counter',
                    'last_scored_date_v6': 'Last date a winner was determined'
                };
                html += cacheData.allKeys.map(k => {
                    const desc = keyDescriptions[k] || 'Unknown key';
                    return `<div style="margin-bottom: 4px;">• <strong>${k}</strong><br><span style="font-size: 0.85rem; color: #718096; margin-left: 12px;">${desc}</span></div>`;
                }).join('');
            } else {
                html += 'No data stored';
            }
            html += '</div>';
            
            // Raw JSON
            html += '<div style="margin-bottom: 15px;"><strong>📦 Raw JSON:</strong></div>';
            html += '<div style="background: #f5f5f5; padding: 10px; border-radius: 6px; margin-bottom: 15px; max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; font-size: 0.8rem;">';
            const rawData = {
                location: cacheData.location,
                scoreboard: cacheData.scoreboard,
                historicalForecasts: cacheData.historicalForecasts,
                lastScoredDate: cacheData.lastScoredDate
            };
            html += JSON.stringify(rawData, null, 2);
            html += '</div>';
            
            html += '</div>';
            
            content.innerHTML = html;
            modal.style.display = 'block';
        },

        /**
         * Hide cache inspector modal
         */
        hideCacheInspector() {
            const modal = document.getElementById('cache-modal');
            modal.style.display = 'none';
        },

        /**
         * Register cache inspector button handlers
         */
        onCacheInspector(callback) {
            const viewBtn = document.getElementById('view-cache-btn');
            const closeBtn = document.getElementById('close-cache-btn');
            const modal = document.getElementById('cache-modal');
            
            if (viewBtn) {
                viewBtn.addEventListener('click', () => {
                    this.showCacheInspector();
                    if (callback) callback();
                });
            }
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hideCacheInspector());
            }
            
            // Close when clicking outside modal
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.hideCacheInspector();
                    }
                });
            }
        },

        /**
         * Update language toggle button text
         */
        updateLanguageToggle(hide = false) {
            const btn = ELEMENTS.languageToggleBtn;
            if (!btn) {
                console.warn('Language toggle button element not found');
                return;
            }
            if (hide) {
                btn.style.display = 'none';
                return;
            }
            const currentLang = I18n.getCurrentLanguage();
            const nextLang = currentLang === 'en' ? 'fr' : 'en';
            const nextLangName = I18n.getLanguageName(nextLang);
            const buttonText = I18n.t('ui.toggleLanguage', nextLangName);
            console.log(`Setting language toggle button text: "${buttonText}" (current: ${currentLang}, next: ${nextLang})`);
            btn.textContent = buttonText;
        },

        /**
         * Update all UI text based on current language
         */
        updateAllText() {
            // Update button labels
            if (ELEMENTS.resetBtn) ELEMENTS.resetBtn.textContent = I18n.t('ui.resetLocation');
            
            // Update status if needed
            const statusEl = document.getElementById('status-log');
            if (statusEl && statusEl.textContent.includes('Status:')) {
                statusEl.textContent = 'Status: ' + I18n.t('status.init');
            }
        },

        /**
         * Register language toggle handler
         */
        onLanguageToggle(callback) {
            // Disabled: language toggle hidden until localization is ready
        },

        /**
         * Register share button handler
         */
        onShare(callback) {
            if (ELEMENTS.shareBtn) {
                ELEMENTS.shareBtn.addEventListener('click', callback);
            }
        },

        /**
         * Display today's historical climate event
         */
        renderHistoryEvent(formattedEvent) {
            if (!formattedEvent || !ELEMENTS.historyContent) {
                if (ELEMENTS.historySection) {
                    ELEMENTS.historySection.classList.add('hidden');
                }
                return;
            }

            ELEMENTS.historyContent.innerHTML = `
                <p style="margin: 0 0 12px 0; font-size: 0.95rem; line-height: 1.6;">${formattedEvent.event}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: #4a5568; margin-top: 12px; padding-top: 12px; border-top: 1px solid #edf2f7;">
                    <span>📅 ${formattedEvent.formattedDate}</span>
                    ${formattedEvent.link !== '#' ? `<a href="${formattedEvent.link}" target="_blank" style="color: #1e3a8a; text-decoration: underline;">🔗 Learn more →</a>` : ''}
                </div>
            `;

            if (ELEMENTS.historySection) {
                ELEMENTS.historySection.classList.remove('hidden');
            }
        },

        /**
         * Render historical normals comparison
         */
        renderHistoricalNormals(normals, todayHigh, todayLow) {
            if (!normals || !ELEMENTS.historicalNormalsContent) return;

            const avgHigh = Math.round(normals.avgHigh);
            const avgLow = Math.round(normals.avgLow);
            const recordHigh = Math.round(normals.recordHigh);
            const recordLow = Math.round(normals.recordLow);
            
            // Compare today's forecast to historical averages
            const highDiff = todayHigh !== null ? Math.round(todayHigh - avgHigh) : null;
            const lowDiff = todayLow !== null ? Math.round(todayLow - avgLow) : null;
            
            const highComparison = highDiff === null ? '' : 
                highDiff > 0 ? `<span style="color: #c53030;">▲ ${highDiff}° above average</span>` :
                highDiff < 0 ? `<span style="color: #1e3a8a;">▼ ${Math.abs(highDiff)}° below average</span>` :
                `<span style="color: #2d3748;">at average</span>`;
                
            const lowComparison = lowDiff === null ? '' :
                lowDiff > 0 ? `<span style="color: #c53030;">▲ ${lowDiff}° above average</span>` :
                lowDiff < 0 ? `<span style="color: #1e3a8a;">▼ ${Math.abs(lowDiff)}° below average</span>` :
                `<span style="color: #2d3748;">at average</span>`;

            ELEMENTS.historicalNormalsContent.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div style="background: #f7fafc; padding: 12px; border-radius: 6px;">
                        <div style="font-size: 0.85rem; color: #4a5568; margin-bottom: 4px;">Average High</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #c53030;">${avgHigh}°</div>
                        ${todayHigh !== null ? `<div style="font-size: 0.9rem; margin-top: 4px; color: #2d3748;">Today: ${Math.round(todayHigh)}° ${highComparison}</div>` : ''}
                    </div>
                    <div style="background: #f7fafc; padding: 12px; border-radius: 6px;">
                        <div style="font-size: 0.85rem; color: #4a5568; margin-bottom: 4px;">Average Low</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #1e3a8a;">${avgLow}°</div>
                        ${todayLow !== null ? `<div style="font-size: 0.9rem; margin-top: 4px; color: #2d3748;">Today: ${Math.round(todayLow)}° ${lowComparison}</div>` : ''}
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 0.9rem; color: #2d3748;">
                    <div>
                        <span>Record High:</span> <strong style="color: #b91c1c;">${recordHigh}°</strong>
                    </div>
                    <div>
                        <span>Record Low:</span> <strong style="color: #1e3a8a;">${recordLow}°</strong>
                    </div>
                </div>
                <div style="font-size: 0.8rem; color: #4a5568; margin-top: 12px; text-align: right;">
                    Based on ${normals.yearsOfData} years of data • 
                    <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener" style="color: #1e3a8a; text-decoration: underline;">Data: Open-Meteo Archive API</a>
                </div>
            `;

            ELEMENTS.historicalNormalsSection.classList.remove('hidden');
        },

        /**
         * Initialize city search functionality
         */
        initCitySearch(onCitySelect) {
            if (!ELEMENTS.citySearchInput || !ELEMENTS.citySearchResults) return;

            // Handle input with debouncing
            ELEMENTS.citySearchInput.addEventListener('input', async (e) => {
                const query = e.target.value.trim();
                
                // Clear previous timeout
                if (searchTimeout) clearTimeout(searchTimeout);
                
                if (query.length < 2) {
                    ELEMENTS.citySearchResults.style.display = 'none';
                    ELEMENTS.citySearchInput.setAttribute('aria-expanded', 'false');
                    return;
                }

                // Debounce search
                searchTimeout = setTimeout(async () => {
                    const results = await Geo.searchCities(query);
                    this.displayCityResults(results, onCitySelect);
                }, 300);
            });

            // Close results when clicking outside
            document.addEventListener('click', (e) => {
                if (!ELEMENTS.citySearchInput.contains(e.target) && !ELEMENTS.citySearchResults.contains(e.target)) {
                    ELEMENTS.citySearchResults.style.display = 'none';
                    ELEMENTS.citySearchInput.setAttribute('aria-expanded', 'false');
                }
            });

            // Focus input on click
            ELEMENTS.citySearchInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // Keyboard navigation for listbox
            ELEMENTS.citySearchInput.addEventListener('keydown', (e) => {
                const items = Array.from(ELEMENTS.citySearchResults.querySelectorAll('[role="option"]'));
                const activeIndex = items.findIndex(el => el === document.activeElement);
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (items.length) {
                        const next = items[Math.max(0, activeIndex + 1) % items.length];
                        next.focus();
                    }
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (items.length) {
                        const prev = items[(activeIndex - 1 + items.length) % items.length];
                        prev.focus();
                    }
                } else if (e.key === 'Escape') {
                    ELEMENTS.citySearchResults.style.display = 'none';
                    ELEMENTS.citySearchInput.setAttribute('aria-expanded', 'false');
                    ELEMENTS.citySearchInput.focus();
                }
            });
        },

        /**
         * Display city search results
         */
        displayCityResults(results, onCitySelect) {
            if (!results || results.length === 0) {
                ELEMENTS.citySearchResults.innerHTML = '<div style="padding: 12px; color: #a0aec0; font-size: 0.9rem;">No cities found</div>';
                ELEMENTS.citySearchResults.style.display = 'block';
                return;
            }

            let html = results.map(city => `
                <li class="city-result-item" role="option" tabindex="-1"
                     data-lat="${city.lat}" 
                     data-lon="${city.lon}" 
                     data-name="${city.name}"
                     data-region="${city.region}"
                     style="padding: 12px; cursor: pointer; border-bottom: 1px solid #edf2f7; transition: background 0.2s;"
                     onmouseover="this.style.background='#f7fafc'" 
                     onmouseout="this.style.background='white'">
                    <div style="font-weight: 600; color: #2d3748;">${city.name}</div>
                    <div style="font-size: 0.85rem; color: #718096;">${city.region ? city.region + ', ' : ''}${city.country}</div>
                </li>
            `).join('');

            ELEMENTS.citySearchResults.innerHTML = html;
            ELEMENTS.citySearchResults.style.display = 'block';
            ELEMENTS.citySearchInput.setAttribute('aria-expanded', 'true');

            // Add click handlers
            ELEMENTS.citySearchResults.querySelectorAll('.city-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const lat = parseFloat(item.dataset.lat);
                    const lon = parseFloat(item.dataset.lon);
                    const name = item.dataset.name;
                    const region = item.dataset.region;
                    const cityName = region ? `${name}-${region}` : name;
                    
                    ELEMENTS.citySearchInput.value = item.querySelector('div').textContent;
                    ELEMENTS.citySearchResults.style.display = 'none';
                    ELEMENTS.citySearchInput.setAttribute('aria-expanded', 'false');
                    
                    if (onCitySelect) {
                        onCitySelect(lat, lon, cityName);
                    }
                });

                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        item.click();
                    } else if (e.key === 'Escape') {
                        ELEMENTS.citySearchResults.style.display = 'none';
                        ELEMENTS.citySearchInput.setAttribute('aria-expanded', 'false');
                        ELEMENTS.citySearchInput.focus();
                    }
                });
            });
        },

        /**
         * Get element reference (for debugging)
         */
        getElement(id) {
            return ELEMENTS[id];
        },

        /**
         * Display battle history with accuracy trends
         */
        async renderBattleHistory() {
            const container = document.getElementById('battle-history-section');
            if (!container) return;

            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #718096;">⏳ Analyzing historical battles...</div>';
            container.style.display = 'block';

            try {
                const battles = await Battles.analyzeAllBattles();
                
                if (!battles || battles.length === 0) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 30px; color: #718096;">
                            <div style="font-size: 2rem; margin-bottom: 10px;">📊</div>
                            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 8px;">No Battle History Yet</div>
                            <div style="font-size: 0.9rem;">Visit the page daily to build up your forecast accuracy history!</div>
                        </div>
                    `;
                    return;
                }

                const trends = Battles.calculateTrends(battles);
                
                // Build HTML
                let html = '<div style="padding: 20px;">';
                
                // Header and stats
                html += '<div style="margin-bottom: 25px;">';
                html += '<h3 style="margin: 0 0 15px 0; font-size: 1.5rem; color: #2d3748;">⚔️ Battle History</h3>';
                html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">';
                
                const modelAName = battles[0]?.modelA || 'Model A';
                const modelBName = battles[0]?.modelB || 'Model B';
                
                html += `
                    <div style="background: #edf2f7; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 0.85rem; color: #718096; margin-bottom: 5px;">Total Battles</div>
                        <div style="font-size: 1.8rem; font-weight: bold; color: #2d3748;">${trends.totalBattles}</div>
                    </div>
                    <div style="background: #bee3f8; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 0.85rem; color: #2c5282; margin-bottom: 5px;">${modelAName} Wins</div>
                        <div style="font-size: 1.8rem; font-weight: bold; color: #2c5282;">${trends.winsA}</div>
                    </div>
                    <div style="background: #fbd38d; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 0.85rem; color: #7c2d12; margin-bottom: 5px;">${modelBName} Wins</div>
                        <div style="font-size: 1.8rem; font-weight: bold; color: #7c2d12;">${trends.winsB}</div>
                    </div>
                    <div style="background: #e2e8f0; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 0.85rem; color: #4a5568; margin-bottom: 5px;">Ties</div>
                        <div style="font-size: 1.8rem; font-weight: bold; color: #4a5568;">${trends.ties}</div>
                    </div>
                `;
                html += '</div>';
                
                // Average errors comparison
                html += '<div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">';
                html += '<div style="font-weight: 600; margin-bottom: 10px; color: #2d3748;">📈 Average Prediction Errors</div>';
                html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9rem;">';
                html += `
                    <div>
                        <div style="color: #2c5282; font-weight: 600; margin-bottom: 5px;">${modelAName}</div>
                        <div>Temp Max: ±${trends.avgErrorA.tempMax.toFixed(1)}°C</div>
                        <div>Temp Min: ±${trends.avgErrorA.tempMin.toFixed(1)}°C</div>
                        <div>Precip: ±${trends.avgErrorA.precip.toFixed(1)}mm</div>
                    </div>
                    <div>
                        <div style="color: #7c2d12; font-weight: 600; margin-bottom: 5px;">${modelBName}</div>
                        <div>Temp Max: ±${trends.avgErrorB.tempMax.toFixed(1)}°C</div>
                        <div>Temp Min: ±${trends.avgErrorB.tempMin.toFixed(1)}°C</div>
                        <div>Precip: ±${trends.avgErrorB.precip.toFixed(1)}mm</div>
                    </div>
                `;
                html += '</div>';
                html += '</div>';
                
                html += '</div>';
                
                // Timeline of battles
                html += '<div style="margin-bottom: 15px; font-weight: 600; color: #2d3748;">📅 Battle Timeline</div>';
                html += '<div style="max-height: 500px; overflow-y: auto;">';
                
                battles.forEach((battle, index) => {
                    const bgColor = battle.overallWinner === 'A' ? '#bee3f8' : 
                                   battle.overallWinner === 'B' ? '#fbd38d' : '#e2e8f0';
                    const borderColor = battle.overallWinner === 'A' ? '#3182ce' : 
                                       battle.overallWinner === 'B' ? '#dd6b20' : '#718096';
                    
                    html += `<div style="background: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 12px; margin-bottom: 10px; border-radius: 6px;">`;
                    html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">`;
                    html += `<div style="font-weight: 600; color: #2d3748;">${battle.date}</div>`;
                    html += `<div style="font-size: 0.9rem; color: #4a5568;">`;
                    if (battle.overallWinner === 'A') html += `🏆 ${battle.modelA}`;
                    else if (battle.overallWinner === 'B') html += `🏆 ${battle.modelB}`;
                    else html += '🤝 Tie';
                    html += `</div>`;
                    html += `</div>`;
                    
                    // Actual weather
                    html += `<div style="font-size: 0.85rem; color: #4a5568; margin-bottom: 8px;">`;
                    html += `<strong>Actual:</strong> ${battle.actual.tempMax?.toFixed(1) || '?'}° / ${battle.actual.tempMin?.toFixed(1) || '?'}° | ${battle.actual.precip?.toFixed(1) || '0'}mm rain`;
                    html += `</div>`;
                    
                    // Predictions and errors
                    html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem;">`;
                    
                    html += `<div style="background: rgba(255,255,255,0.5); padding: 8px; border-radius: 4px;">`;
                    html += `<div style="color: #2c5282; font-weight: 600; margin-bottom: 4px;">${battle.modelA}</div>`;
                    html += `<div>Predicted: ${battle.predicted.modelA.tempMax?.toFixed(1) || '?'}° / ${battle.predicted.modelA.tempMin?.toFixed(1) || '?'}° | ${battle.predicted.modelA.precip?.toFixed(1) || '0'}mm</div>`;
                    html += `<div style="color: #718096; font-size: 0.8rem;">`;
                    html += `Error: ${battle.errors.modelA.tempMax !== null ? '±' + battle.errors.modelA.tempMax.toFixed(1) + '°' : '—'} / `;
                    html += `${battle.errors.modelA.tempMin !== null ? '±' + battle.errors.modelA.tempMin.toFixed(1) + '°' : '—'} | `;
                    html += `${battle.errors.modelA.precip !== null ? '±' + battle.errors.modelA.precip.toFixed(1) + 'mm' : '—'}`;
                    html += `</div>`;
                    html += `</div>`;
                    
                    html += `<div style="background: rgba(255,255,255,0.5); padding: 8px; border-radius: 4px;">`;
                    html += `<div style="color: #7c2d12; font-weight: 600; margin-bottom: 4px;">${battle.modelB}</div>`;
                    html += `<div>Predicted: ${battle.predicted.modelB.tempMax?.toFixed(1) || '?'}° / ${battle.predicted.modelB.tempMin?.toFixed(1) || '?'}° | ${battle.predicted.modelB.precip?.toFixed(1) || '0'}mm</div>`;
                    html += `<div style="color: #718096; font-size: 0.8rem;">`;
                    html += `Error: ${battle.errors.modelB.tempMax !== null ? '±' + battle.errors.modelB.tempMax.toFixed(1) + '°' : '—'} / `;
                    html += `${battle.errors.modelB.tempMin !== null ? '±' + battle.errors.modelB.tempMin.toFixed(1) + '°' : '—'} | `;
                    html += `${battle.errors.modelB.precip !== null ? '±' + battle.errors.modelB.precip.toFixed(1) + 'mm' : '—'}`;
                    html += `</div>`;
                    html += `</div>`;
                    
                    html += `</div>`;
                    html += `</div>`;
                });
                
                html += '</div>';
                html += '</div>';
                
                container.innerHTML = html;
            } catch (error) {
                console.error('Failed to render battle history:', error);
                container.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: #c53030;">
                        <div style="font-size: 1.5rem; margin-bottom: 10px;">⚠️</div>
                        <div>Failed to load battle history</div>
                        <div style="font-size: 0.85rem; margin-top: 8px; color: #718096;">${error.message}</div>
                    </div>
                `;
            }
        },

        /**
         * Show/hide battle history section
         */
        toggleBattleHistory() {
            const container = document.getElementById('battle-history-section');
            if (!container) return;
            
            if (container.style.display === 'none' || !container.style.display) {
                this.renderBattleHistory();
            } else {
                container.style.display = 'none';
            }
        }
    };
})();
