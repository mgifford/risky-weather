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
        srAnnouncer: document.getElementById('sr-announcer'),
        actionsSection: document.getElementById('actions-section'),
        debugSection: document.getElementById('debug-section'),
        scenarioBadge: document.getElementById('scenario-badge')
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
            stationEl.style.color = 'var(--subtext)';
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
            link.style.color = 'var(--highlight)';
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
            histLink.style.color = 'var(--highlight)';
            histLink.textContent = I18n.t('ui.ecccHistoricalLink') || 'ECCC Historical Data (Today)';
            const almLink = document.createElement('a');
            almLink.target = '_blank';
            almLink.rel = 'noopener noreferrer';
            almLink.style.fontSize = '0.8rem';
            almLink.style.color = 'var(--highlight)';
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
            this.updateDebugInfoVisibility();
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
            this.updateDebugInfoVisibility();
        },

        /**
         * Hide debug info if nothing to display
         */
        updateDebugInfoVisibility() {
            const debugInfo = document.querySelector('.debug-info');
            if (!debugInfo) return;
            
            const ipText = ELEMENTS.ipDisplay.innerText;
            const storageText = ELEMENTS.storageDisplay.innerText;
            
            // Hide if both are empty or just dashes
            if ((ipText === '—' || !ipText) && (storageText === 'Empty' || !storageText)) {
                debugInfo.style.display = 'none';
            } else {
                debugInfo.style.display = '';
            }
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
            ELEMENTS.valA.innerHTML = `${iconA} ${Calculations.formatTemp(data.tempMaxA)}<span style="font-size: 0.7em; color: var(--subtext);">/${Calculations.formatTemp(data.tempMinA)}</span>`;
            ELEMENTS.valB.innerHTML = `${iconB} ${Calculations.formatTemp(data.tempMaxB)}<span style="font-size: 0.7em; color: var(--subtext);">/${Calculations.formatTemp(data.tempMinB)}</span>`;
            
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
                ELEMENTS.valA.innerHTML += `<div style="font-size: 0.75rem; color: var(--subtext); margin-top: 4px;">${detailsA}</div>`;
            }
            if (detailsB) {
                ELEMENTS.valB.innerHTML += `<div style="font-size: 0.75rem; color: var(--subtext); margin-top: 4px;">${detailsB}</div>`;
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
                const extremeBadge = extremeA ? `<div style="color: var(--accent); font-size: 0.75rem; font-weight: bold; margin-top: 2px;">${extremeA}</div>` : '';

                // Add uncertainty indicator if present
                const uncertaintyBadge = uncertaintyIcon ? 
                    `<span class="uncertainty-badge" title="${disagreementTooltip}" style="cursor: help; margin-left: 4px;">${uncertaintyIcon}</span>` : '';

                html += `<tr>
                    <td class="col-day">${dayName}${uncertaintyBadge}${extremeBadge}</td>
                    <td title="${Calculations.getProbabilityTooltip(probA)}" style="cursor: help;">
                        <div>${iconA} ${cellA}</div>
                        ${detailsA ? `<div style="font-size: 0.75rem; color: var(--subtext); margin-top: 2px;">${detailsA}</div>` : ''}
                            ${detailsA ? `<div style="font-size: 0.75rem; color: var(--subtext); margin-top: 2px;">${detailsA}</div>` : ''}
                    </td>
                    <td title="${Calculations.getProbabilityTooltip(probB)}" style="cursor: help;">
                        <div>${iconB} ${cellB}</div>
                        ${detailsB ? `<div style="font-size: 0.75rem; color: var(--subtext); margin-top: 2px;">${detailsB}</div>` : ''}
                            ${detailsB ? `<div style="font-size: 0.75rem; color: var(--subtext); margin-top: 2px;">${detailsB}</div>` : ''}
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
                ELEMENTS.stripes.innerHTML = '<div style="text-align: center; color: var(--subtext); padding: 10px;">No historical data available</div>';
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
                <p style="font-size:0.85rem; color:var(--subtext);">
                    ${modelAName} forecast: ${modelAProbability}% Chance of precipitation<br>
                    ${modelBName} forecast: ${modelBProbability}% Chance of precipitation
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
                    <p style="font-size:0.85rem; color:var(--subtext);">
                        Actual High: <strong>${formatTemp(tempData.actualTempMax)}</strong>, 
                        Low: <strong>${formatTemp(tempData.actualTempMin)}</strong>
                    </p>
                    <p style="font-size:0.85rem; color:var(--subtext);">
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
            ELEMENTS.winnerDisplay.innerHTML = `<div class="winner-banner" style="background:var(--card); color:var(--subtext);">🤝 Draw</div>`;
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
                    html += '<div style="color: var(--subtext); font-style: italic;">No past forecasts yet. Today\'s forecast will become historical tomorrow!</div>';
                } else {
                    html += `<div style="margin-bottom: 10px;"><strong>Past Forecasts: ${pastForecasts.length}</strong> (excludes today)</div>`;
                    pastForecasts.forEach((forecast, index) => {
                        const isYesterday = index === 0;
                        html += `<div style="padding: 8px; margin-bottom: 8px; background: ${isYesterday ? '#fff3cd' : 'white'}; border: 1px solid #ddd; border-radius: 4px;">`;
                        html += `<div style="font-weight: 600; margin-bottom: 4px;">${isYesterday ? '⏮️ ' : ''}${forecast.savedDate || 'N/A'}</div>`;
                    if (forecast.lat && forecast.lon) {
                        html += `<div style="font-size: 0.85rem; color: var(--subtext);">Location: ${forecast.lat.toFixed(2)}, ${forecast.lon.toFixed(2)}</div>`;
                            html += `<div style="font-size: 0.85rem; color: var(--subtext);">Location: ${forecast.lat.toFixed(2)}, ${forecast.lon.toFixed(2)}</div>`;
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
                html += `<div style="margin-top: 8px; font-size: 0.85rem; color: var(--subtext);">Note: Revisit the page to migrate to new multi-day format.</div>`;
                    html += `<div style="margin-top: 8px; font-size: 0.85rem; color: var(--subtext);">Note: Revisit the page to migrate to new multi-day format.</div>`;
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
                    return `<div style="margin-bottom: 4px;">• <strong>${k}</strong><br><span style="font-size: 0.85rem; color: var(--subtext); margin-left: 12px;">${desc}</span></div>`;
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
         * Share a history event to Bluesky (or clipboard fallback)
         */
        async shareHistoryEvent(formattedEvent) {
            try {
                const baseUrl = window.location.origin + window.location.pathname;
                const link = `${baseUrl}`; // use root page for sharing

                const message = `${formattedEvent.event}\n\n📅 ${formattedEvent.formattedDate}\n\n${link}`;

                // Try Web Share API first
                if (navigator.share) {
                    try {
                        await navigator.share({ title: formattedEvent.event, text: message, url: link });
                        return;
                    } catch (e) {
                        // Fall through to Bluesky / clipboard
                    }
                }

                // Construct Bluesky post intent (opens new window to post)
                // Bluesky does not have a simple URL intent for posting publicly, but many clients support deep links.
                // We'll attempt to open the mgifford/bsky.app composer link if available, otherwise copy to clipboard.
                const blueskyComposer = `https://bsky.app/compose?text=${encodeURIComponent(message)}`;
                const win = window.open(blueskyComposer, '_blank');
                if (win) {
                    // Opened composer in new tab
                    return;
                }

                // Clipboard fallback
                await navigator.clipboard.writeText(message);
                alert('Post text copied to clipboard. Paste into Bluesky or other social app.');
            } catch (err) {
                console.error('Failed to share history event:', err);
                try { await navigator.clipboard.writeText(`${formattedEvent.event}\n\n📅 ${formattedEvent.formattedDate}\n\n${window.location.origin + window.location.pathname}`); } catch (e) {}
                alert('Could not open Bluesky composer; post text copied to clipboard.');
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
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: var(--subtext); margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--card);">
                    <span>📅 ${formattedEvent.formattedDate}</span>
                    <div style="display:flex; gap:8px; align-items:center;">
                        ${formattedEvent.link !== '#' ? `<a href="${formattedEvent.link}" target="_blank" style="color: var(--highlight); text-decoration: underline;">🔗 Learn more →</a>` : ''}
                        <button id="history-share-btn" class="btn-history-share">Share</button>
                    </div>
                </div>
            `;

            // Attach share handler
            const shareBtn = document.getElementById('history-share-btn');
            if (shareBtn) {
                shareBtn.addEventListener('click', () => this.shareHistoryEvent(formattedEvent));
            }

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
                highDiff > 0 ? `<span style="color: var(--accent);">▲ ${highDiff}° above average</span>` :
                highDiff < 0 ? `<span style="color: var(--highlight);">▼ ${Math.abs(highDiff)}° below average</span>` :
                `<span style="color: var(--subtext);">at average</span>`;
                
                const lowComparison = lowDiff === null ? '' :
                lowDiff > 0 ? `<span style="color: var(--accent);">▲ ${lowDiff}° above average</span>` :
                lowDiff < 0 ? `<span style="color: var(--highlight);">▼ ${Math.abs(lowDiff)}° below average</span>` :
                `<span style="color: var(--subtext);">at average</span>`;

            // Summary section (always visible)
            const summaryContent = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div style="background: var(--card); padding: 12px; border-radius: 6px;">
                        <div style="font-size: 0.85rem; color: var(--subtext); margin-bottom: 4px;">Average High</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent);">${avgHigh}°</div>
                        ${todayHigh !== null ? `<div style="font-size: 0.9rem; margin-top: 4px; color: var(--text);">Today: ${Math.round(todayHigh)}° ${highComparison}</div>` : ''}
                    </div>
                    <div style="background: var(--card); padding: 12px; border-radius: 6px;">
                        <div style="font-size: 0.85rem; color: var(--subtext); margin-bottom: 4px;">Average Low</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--highlight);">${avgLow}°</div>
                        ${todayLow !== null ? `<div style="font-size: 0.9rem; margin-top: 4px; color: var(--text);">Today: ${Math.round(todayLow)}° ${lowComparison}</div>` : ''}
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 0.9rem; color: var(--text);">
                    <div>
                        <span>Record High:</span> <strong style="color: var(--accent);">${recordHigh}°</strong>
                    </div>
                    <div>
                        <span>Record Low:</span> <strong style="color: var(--highlight);">${recordLow}°</strong>
                    </div>
                </div>
            `;

            // Accordion content (additional details)
            const detailsContent = `
                <div style="font-size: 0.8rem; color: var(--subtext); text-align: right;">
                    Based on ${normals.yearsOfData} years of data • 
                    <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener" style="color: inherit; text-decoration: underline;">Data: Open-Meteo Archive API</a>
                </div>
            `;

            // Render summary (always visible)
            const summaryElement = document.getElementById('historical-normals-summary');
            if (summaryElement) {
                summaryElement.innerHTML = summaryContent;
            }

            // Render details (in accordion)
            ELEMENTS.historicalNormalsContent.innerHTML = detailsContent;

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
                ELEMENTS.citySearchResults.innerHTML = '<div style="padding: 12px; color: var(--subtext); font-size: 0.9rem;">No cities found</div>';
                ELEMENTS.citySearchResults.style.display = 'block';
                return;
            }

            let html = results.map(city => `
                <li class="city-result-item" role="option" tabindex="-1"
                     data-lat="${city.lat}" 
                     data-lon="${city.lon}" 
                     data-name="${city.name}"
                     data-region="${city.region}"
                     style="padding: 12px; cursor: pointer; border-bottom: 1px solid var(--card); transition: background 0.2s;"
                     onmouseover="this.style.background=getComputedStyle(document.documentElement).getPropertyValue('--bg')" 
                     onmouseout="this.style.background=getComputedStyle(document.documentElement).getPropertyValue('--card')">
                    <div style="font-weight: 600; color: var(--text);">${city.name}</div>
                    <div style="font-size: 0.85rem; color: var(--subtext);">${city.region ? city.region + ', ' : ''}${city.country}</div>
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

            container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--subtext);">⏳ Analyzing historical battles...</div>';
            container.style.display = 'block';

            try {
                const history = Storage.getHistoricalForecasts();
                const historyCount = history ? history.length : 0;
                console.log(`renderBattleHistory: Found ${historyCount} historical forecasts in storage`);
                
                const battles = await Battles.analyzeAllBattles();
                console.log(`renderBattleHistory: Analysis returned ${battles ? battles.length : 0} battles`);
                
                if (!battles || battles.length === 0) {
                    const today = new Date().toISOString().split('T')[0];
                    let diagInfo = '';
                    
                    if (history && history.length > 0) {
                        diagInfo = `<div style="font-size: 0.8rem; color: var(--subtext); margin-top: 15px; padding: 10px; background: var(--card); border-radius: 4px;">
                            <strong>Debug Info:</strong><br/>
                            Forecasts in storage: ${historyCount}<br/>
                            Today's date: ${today}<br/>
                            Forecast dates: ${history.map(h => h.savedDate).join(', ')}<br/>
                            <em>Check browser console for detailed analysis logs</em>
                        </div>`;
                    }
                    
                    container.innerHTML = `
                        <div style="text-align: center; padding: 30px; color: var(--subtext);">
                            <div style="font-size: 2rem; margin-bottom: 10px;">📊</div>
                            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 8px;">No Battle Results Yet</div>
                            <div style="font-size: 0.9rem;">
                                ${historyCount === 0 
                                    ? 'Visit the page daily to build up your forecast accuracy history!' 
                                    : 'Battles are being analyzed. Check back in a moment!'}
                            </div>
                            ${diagInfo}
                        </div>
                    `;
                    return;
                }

                const trends = Battles.calculateTrends(battles);
                const modelAName = battles[0]?.modelA || 'Model A';
                const modelBName = battles[0]?.modelB || 'Model B';
                
                // Build HTML - Summary at top level (always visible)
                let html = '<div style="padding: 20px;">';
                
                // Header
                html += '<div style="margin-bottom: 20px;">';
                    html += '<h3 style="margin: 0 0 15px 0; font-size: 1.5rem; color: var(--text);">⚔️ Weather Model Battles</h3>';
                
                // Summary score boxes
                html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 15px;">';
                
                html += `
                    <div style="background: color-mix(in srgb, var(--highlight) 12%, transparent); padding: 12px; border-radius: 8px; text-align: center; border-left: 4px solid var(--highlight);">
                        <div style="font-size: 0.85rem; color: var(--highlight); margin-bottom: 4px;">Wins</div>
                        <div style="font-size: 1.6rem; font-weight: bold; color: var(--highlight);">${trends.winsA}</div>
                        <div style="font-size: 0.75rem; color: var(--highlight);">${modelAName}</div>
                    </div>
                    <div style="background: color-mix(in srgb, var(--accent) 12%, transparent); padding: 12px; border-radius: 8px; text-align: center; border-left: 4px solid var(--accent);">
                        <div style="font-size: 0.85rem; color: var(--accent); margin-bottom: 4px;">Wins</div>
                        <div style="font-size: 1.6rem; font-weight: bold; color: var(--accent);">${trends.winsB}</div>
                        <div style="font-size: 0.75rem; color: var(--accent);">${modelBName}</div>
                    </div>
                    <div style="background: var(--card); padding: 12px; border-radius: 8px; text-align: center; border-left: 4px solid var(--subtext);">
                        <div style="font-size: 0.85rem; color: var(--subtext); margin-bottom: 4px;">Ties</div>
                        <div style="font-size: 1.6rem; font-weight: bold; color: var(--subtext);">${trends.ties}</div>
                    </div>
                `;
                html += '</div>';
                html += '</div>';
                
                // Collapsible details section
                html += '<details style="margin-top: 15px;">';
                html += '<summary style="cursor: pointer; font-weight: 600; font-size: 1rem; padding: 8px 0; list-style-position: outside; color: var(--text);">📋 View Detailed Analysis</summary>';
                
                html += '<div style="margin-top: 12px;">';
                
                // Average errors
                html += '<div style="background: var(--bg); padding: 15px; border-radius: 8px; margin-bottom: 15px;">';
                html += '<div style="font-weight: 600; margin-bottom: 10px; color: var(--text);">📈 Average Prediction Errors</div>';
                html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9rem;">';
                html += `
                    <div>
                        <div style="color: var(--highlight); font-weight: 600; margin-bottom: 5px;">${modelAName}</div>
                        <div>Temp Max: ±${trends.avgErrorA.tempMax.toFixed(1)}°C</div>
                        <div>Temp Min: ±${trends.avgErrorA.tempMin.toFixed(1)}°C</div>
                        <div>Precip: ±${trends.avgErrorA.precip.toFixed(1)}mm</div>
                    </div>
                    <div>
                        <div style="color: var(--accent); font-weight: 600; margin-bottom: 5px;">${modelBName}</div>
                        <div>Temp Max: ±${trends.avgErrorB.tempMax.toFixed(1)}°C</div>
                        <div>Temp Min: ±${trends.avgErrorB.tempMin.toFixed(1)}°C</div>
                        <div>Precip: ±${trends.avgErrorB.precip.toFixed(1)}mm</div>
                    </div>
                `;
                html += '</div>';
                html += '</div>';
                
                // Battle timeline
                html += '<div style="margin-bottom: 15px; font-weight: 600; color: var(--text);">📅 Battle Timeline</div>';
                html += '<div style="max-height: 400px; overflow-y: auto;">';
                
                battles.forEach((battle, index) => {
                    const bgColor = battle.overallWinner === 'A' ? 'color-mix(in srgb, var(--highlight) 12%, transparent)' : 
                                   battle.overallWinner === 'B' ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'color-mix(in srgb, var(--card) 90%, transparent)';
                    const borderColor = battle.overallWinner === 'A' ? 'var(--highlight)' : 
                                       battle.overallWinner === 'B' ? 'var(--accent)' : 'var(--subtext)';
                    
                    html += `<div style="background: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 12px; margin-bottom: 10px; border-radius: 6px;">';`;
                    html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">`;
                    html += `<div style="font-weight: 600; color: var(--text);">`;
                    html += `${battle.date}`;
                    if (battle.leadDays !== undefined && battle.leadDays > 0) {
                        html += ` <span style="font-size: 0.75rem; color: var(--subtext);">(forecast from ${battle.forecastDate}, +${battle.leadDays}d)</span>`;
                    }
                    html += `</div>`;
                    html += `<div style="font-size: 0.9rem; color: var(--subtext);">`;
                    if (battle.overallWinner === 'A') html += `🏆 ${battle.modelA}`;
                    else if (battle.overallWinner === 'B') html += `🏆 ${battle.modelB}`;
                    else html += '🤝 Tie';
                    html += `</div>`;
                    html += `</div>`;
                    
                    // Actual weather
                    html += `<div style="font-size: 0.85rem; color: var(--subtext); margin-bottom: 8px;">`;
                    html += `<strong>Actual:</strong> ${battle.actual.tempMax?.toFixed(1) || '?'}° / ${battle.actual.tempMin?.toFixed(1) || '?'}° | ${battle.actual.precip?.toFixed(1) || '0'}mm rain`;
                    html += `</div>`;
                    
                    // Predictions and errors
                    html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem;">`;
                    
                    html += `<div style="background: color-mix(in srgb, var(--card) 85%, transparent); padding: 8px; border-radius: 4px;">`;
                    html += `<div style="color: var(--highlight); font-weight: 600; margin-bottom: 4px;">${battle.modelA}</div>`;
                    html += `<div>Predicted: ${battle.predicted.modelA.tempMax?.toFixed(1) || '?'}° / ${battle.predicted.modelA.tempMin?.toFixed(1) || '?'}° | ${battle.predicted.modelA.precip?.toFixed(1) || '0'}mm</div>`;
                    html += `<div style="color: var(--subtext); font-size: 0.8rem;">`;
                    html += `Error: ${battle.errors.modelA.tempMax !== null ? '±' + battle.errors.modelA.tempMax.toFixed(1) + '°' : '—'} / `;
                    html += `${battle.errors.modelA.tempMin !== null ? '±' + battle.errors.modelA.tempMin.toFixed(1) + '°' : '—'} | `;
                    html += `${battle.errors.modelA.precip !== null ? '±' + battle.errors.modelA.precip.toFixed(1) + 'mm' : '—'}`;
                    html += `</div>`;
                    html += `</div>`;
                    
                    html += `<div style="background: color-mix(in srgb, var(--card) 85%, transparent); padding: 8px; border-radius: 4px;">`;
                    html += `<div style="color: var(--accent); font-weight: 600; margin-bottom: 4px;">${battle.modelB}</div>`;
                    html += `<div>Predicted: ${battle.predicted.modelB.tempMax?.toFixed(1) || '?'}° / ${battle.predicted.modelB.tempMin?.toFixed(1) || '?'}° | ${battle.predicted.modelB.precip?.toFixed(1) || '0'}mm</div>`;
                    html += `<div style="color: var(--subtext); font-size: 0.8rem;">`;
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
                html += '</details>';
                html += '</div>';
                
                container.innerHTML = html;
            } catch (error) {
                console.error('Failed to render battle history:', error);
                container.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: var(--accent);">
                        <div style="font-size: 1.5rem; margin-bottom: 10px;">⚠️</div>
                        <div>Failed to load battle history</div>
                        <div style="font-size: 0.85rem; margin-top: 8px; color: var(--subtext);">${error.message}</div>
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
        },

        /**
         * Render current weather conditions
         */
        async renderCurrentConditions(currentData, modelAName, modelBName, units, isCanada = false) {
            const section = document.getElementById('current-conditions');
            if (!section || !currentData || !currentData.current) {
                console.warn('Current conditions section not found or no data');
                return;
            }

            // For Canada, also try to fetch Environment Canada data
            let ecData = null;
            if (isCanada) {
                try {
                    // Extract lat/lon from the API response (assuming currentData has timezone info)
                    // We need to get lat/lon from somewhere - for now we'll skip EC if not available
                    ecData = null; // Will be passed from app.js if available
                } catch (e) {
                    console.warn('Could not fetch Environment Canada data:', e);
                }
            }

            // Show the section
            section.classList.remove('hidden');

            // Update time
            const currentTime = document.getElementById('current-time');
            if (currentTime && currentData.current.time) {
                const time = new Date(currentData.current.time);
                currentTime.textContent = `${I18n.t('ui.asOf') || 'As of'} ${time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
            }

            // Extract current data from Open-Meteo
            const temp = currentData.current.temperature_2m;
            const code = currentData.current.weather_code;
            const humidity = currentData.current.relative_humidity_2m;
            const feelsLike = currentData.current.apparent_temperature;
            const precip = currentData.current.precipitation;
            const wind = currentData.current.wind_speed_10m;

            // Get elements
            const tempEl = document.getElementById('current-temp');
            const iconEl = document.getElementById('current-icon');
            const descEl = document.getElementById('current-desc');
            const detailsEl = document.getElementById('current-details');

            if (!tempEl || !iconEl || !descEl || !detailsEl) return;

            // Temperature
            if (temp !== null && temp !== undefined) {
                tempEl.textContent = `${Math.round(temp)}°${units === 'fahrenheit' ? 'F' : 'C'}`;
            } else {
                tempEl.textContent = '--°';
            }

            // Weather icon and description
            const icon = Calculations.getWeatherIcon(code);
            const description = Calculations.getWeatherDescription(code);
            iconEl.textContent = icon;
            descEl.textContent = description;

            // Additional details
            let details = [];
            
            if (feelsLike !== null && feelsLike !== undefined) {
                const feelsLikeRounded = Math.round(feelsLike);
                const tempDiff = Math.abs(feelsLikeRounded - Math.round(temp));
                if (tempDiff >= 3) {
                    details.push(`${I18n.t('ui.feelsLike') || 'Feels like'} ${feelsLikeRounded}°${units === 'fahrenheit' ? 'F' : 'C'}`);
                }
            }
            
            if (humidity !== null && humidity !== undefined) {
                details.push(`${I18n.t('ui.humidity') || 'Humidity'}: ${Math.round(humidity)}%`);
            }
            
            if (wind !== null && wind !== undefined && wind > 0) {
                const windUnit = units === 'fahrenheit' ? 'mph' : 'km/h';
                details.push(`${I18n.t('ui.wind') || 'Wind'}: ${Math.round(wind)} ${windUnit}`);
            }
            
            if (precip !== null && precip !== undefined && precip > 0) {
                const precipUnit = units === 'fahrenheit' ? 'in' : 'mm';
                details.push(`${I18n.t('ui.precipitation') || 'Precipitation'}: ${precip.toFixed(1)} ${precipUnit}`);
            }

            // Add source indicator
            let sourceLabel = 'Open-Meteo';
            if (ecData && ecData.source === 'environment_canada') {
                // Compare the two if both available
                const tempDiff = Math.abs((ecData.current.temperature_2m || 0) - (temp || 0));
                const humidDiff = Math.abs((ecData.current.relative_humidity_2m || 0) - (humidity || 0));
                
                // If significantly different, show both
                if (tempDiff > 2 || humidDiff > 10) {
                    sourceLabel = 'Open-Meteo (Environment Canada differs)';
                } else {
                    sourceLabel = 'Open-Meteo & Environment Canada';
                }
            }
            details.push(`<span style="font-size: 0.85rem; color: var(--subtext);">${sourceLabel}</span>`);

            detailsEl.innerHTML = details.join(' &nbsp;•&nbsp; ');
        },

        /**
         * Render current conditions for a single model
         */
        renderCurrentModel(modelId, temp, weatherCode, humidity, feelsLike, precip, wind, units) {
            const tempEl = document.getElementById(`current-temp-${modelId}`);
            const iconEl = document.getElementById(`current-icon-${modelId}`);
            const descEl = document.getElementById(`current-desc-${modelId}`);
            const detailsEl = document.getElementById(`current-details-${modelId}`);

            if (!tempEl || !iconEl || !descEl || !detailsEl) return;

            // Temperature
            if (temp !== null && temp !== undefined) {
                tempEl.textContent = `${Math.round(temp)}°${units === 'fahrenheit' ? 'F' : 'C'}`;
            } else {
                tempEl.textContent = '--°';
            }

            // Weather icon and description
            const icon = Calculations.getWeatherIcon(weatherCode);
            const description = Calculations.getWeatherDescription(weatherCode);
            iconEl.textContent = icon;
            descEl.textContent = description;

            // Additional details
            let details = [];
            
            if (feelsLike !== null && feelsLike !== undefined) {
                const feelsLikeRounded = Math.round(feelsLike);
                const tempDiff = Math.abs(feelsLikeRounded - Math.round(temp));
                if (tempDiff >= 3) {
                    details.push(`${I18n.t('ui.feelsLike') || 'Feels like'} ${feelsLikeRounded}°${units === 'fahrenheit' ? 'F' : 'C'}`);
                }
            }
            
            if (humidity !== null && humidity !== undefined) {
                details.push(`${I18n.t('ui.humidity') || 'Humidity'}: ${Math.round(humidity)}%`);
            }
            
            if (wind !== null && wind !== undefined && wind > 0) {
                const windUnit = units === 'fahrenheit' ? 'mph' : 'km/h';
                details.push(`${I18n.t('ui.wind') || 'Wind'}: ${Math.round(wind)} ${windUnit}`);
            }
            
            if (precip !== null && precip !== undefined && precip > 0) {
                const precipUnit = units === 'fahrenheit' ? 'in' : 'mm';
                details.push(`${I18n.t('ui.precipitation') || 'Precipitation'}: ${precip.toFixed(1)} ${precipUnit}`);
            }

            detailsEl.innerHTML = details.join('<br>');
        },

        /**
         * Render Actions Panel
         */
        renderActionsPanel(actions, location) {
            if (!ELEMENTS.actionsSection) return;

            if (!actions || actions.length === 0) {
                ELEMENTS.actionsSection.classList.add('hidden');
                return;
            }

            ELEMENTS.actionsSection.classList.remove('hidden');

            const html = actions.map(action => {
                const severityClass = action.severity === 'urgent' ? 'action-urgent' : 
                                     action.severity === 'important' ? 'action-important' : 
                                     'action-info';
                
                const easterEggHtml = action.easterEgg && action.easterEggText ? 
                    `<div style="margin-top: 8px; padding: 8px; background: color-mix(in srgb, #FFD700 20%, transparent); border-left: 3px solid #FFD700; border-radius: 3px; font-size: 0.9rem; color: var(--text);"><strong>🥚 Easter egg:</strong> ${action.easterEggText}</div>` : '';
                
                return `
                    <div class="action-card ${severityClass}" data-action-id="${action.id}">
                        <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px;">
                            <div style="flex: 1;">
                                <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 4px; color: var(--text);">${action.title}</div>
                                <div style="font-size: 0.95rem; color: var(--text); margin-bottom: 8px; line-height: 1.4;">${action.description}</div>
                                <div style="font-size: 0.8rem; color: var(--subtext); font-style: italic;">Why: ${action.why}</div>
                                ${action.timeframe ? `<div style="font-size: 0.8rem; color: var(--subtext); margin-top: 4px;"><strong>When:</strong> ${action.timeframe}</div>` : ''}
                            </div>
                        </div>
                        ${easterEggHtml}
                        <div style="display: flex; gap: 8px; margin-top: 12px;">
                            <button class="action-btn action-btn-done" onclick="UI.dismissAction('${action.id}', '${location.lat},${location.lon}', ${action.dismissTTLHours})">Done</button>
                            ${action.remindLaterTTLHours ? `<button class="action-btn action-btn-remind" onclick="UI.dismissAction('${action.id}', '${location.lat},${location.lon}', ${action.remindLaterTTLHours})">Remind later</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            const container = ELEMENTS.actionsSection.querySelector('#actions-content');
            if (container) {
                container.innerHTML = html;
            }
        },

        /**
         * Handle action dismissal
         */
        dismissAction(actionId, locationKey, ttlHours) {
            Actions.dismissAction(actionId, locationKey, ttlHours);
            
            // Remove from DOM
            const card = document.querySelector(`[data-action-id="${actionId}"]`);
            if (card) {
                card.style.opacity = '0.5';
                card.style.pointerEvents = 'none';
                setTimeout(() => {
                    card.remove();
                    
                    // Hide section if no actions remain
                    const container = document.getElementById('actions-content');
                    if (container && container.children.length === 0) {
                        ELEMENTS.actionsSection.classList.add('hidden');
                    }
                }, 300);
            }
        },

        /**
         * Show scenario mode badge
         */
        showScenarioBadge(badgeInfo) {
            if (!ELEMENTS.scenarioBadge) return;
            
            if (!badgeInfo || !badgeInfo.show) {
                ELEMENTS.scenarioBadge.style.display = 'none';
                return;
            }

            ELEMENTS.scenarioBadge.style.display = 'flex';
            ELEMENTS.scenarioBadge.innerHTML = `
                <div style="flex: 1;">
                    <strong style="color: #FF9800;">🧪 ${badgeInfo.text}</strong>
                </div>
                <button onclick="Scenario.clearOverrides(); location.reload();" style="
                    background: none;
                    border: none;
                    color: #FF9800;
                    cursor: pointer;
                    font-weight: 600;
                    padding: 0;
                ">Clear</button>
            `;
        },

        /**
         * Show debug section
         */
        showDebugInfo(debugInfo) {
            if (!ELEMENTS.debugSection) return;

            const html = `
                <details>
                    <summary style="cursor: pointer; font-weight: 600; padding: 8px 0;">🐛 Debug Info</summary>
                    <div style="margin-top: 12px; font-size: 0.85rem; line-height: 1.6; color: var(--subtext); background: var(--card); padding: 12px; border-radius: 6px; max-height: 400px; overflow-y: auto;">
                        <div><strong>Mode:</strong> ${debugInfo.mode}</div>
                        ${debugInfo.scenario ? `<div><strong>Scenario:</strong> ${debugInfo.scenario}</div>` : ''}
                        <div><strong>Overrides active:</strong> ${debugInfo.overridesActive}</div>
                        <div style="margin-top: 12px;"><strong>Candidates (${debugInfo.candidates.length}):</strong></div>
                        <ul style="margin: 4px 0 0 20px;">
                            ${debugInfo.candidates.map(a => `<li>${a.type}: ${a.title}</li>`).join('')}
                        </ul>
                        <div style="margin-top: 12px;"><strong>Actionable (${debugInfo.filtered.length}):</strong></div>
                        <ul style="margin: 4px 0 0 20px;">
                            ${debugInfo.filtered.map(a => `<li>${a.type}: ${a.title}</li>`).join('')}
                        </ul>
                        ${Object.keys(debugInfo.dismissed).length > 0 ? `
                            <div style="margin-top: 12px;"><strong>Dismissed (by TTL):</strong></div>
                            <ul style="margin: 4px 0 0 20px;">
                                ${Object.entries(debugInfo.dismissed).map(([id, info]) => 
                                    `<li>${id} (expires in ${Math.round((info.ttlHours * 3600000 - (Date.now() - info.dismissedAt)) / 3600000)} hrs)</li>`
                                ).join('')}
                            </ul>
                        ` : ''}
                    </div>
                </details>
            `;

            ELEMENTS.debugSection.innerHTML = html;
            ELEMENTS.debugSection.style.display = 'block';
        }
    };
})();
