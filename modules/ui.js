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
        historicalNormalsContent: document.getElementById('historical-normals-content')
    };

    let currentLessonIndex = 0;
    let searchTimeout = null;

    return {
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
        setStorageInfo(hasLocation, hasHistory, hasScoreboard) {
            const items = [];
            if (hasLocation) items.push('Location');
            if (hasHistory) items.push('History');
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
                historicalForecasts: JSON.parse(localStorage.getItem('history_v6_pending') || 'null'),
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
                html += `Lon: ${cacheData.location.lon || 'N/A'}<br>`;
                html += `IP: ${cacheData.location.ip || 'N/A'}`;
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
            html += '<div style="margin-bottom: 15px;"><strong>📅 Daily Forecasts Stored:</strong></div>';
            html += '<div style="background: #f5f5f5; padding: 10px; border-radius: 6px; margin-bottom: 15px;">';
            if (cacheData.historicalForecasts) {
                const forecast = cacheData.historicalForecasts;
                html += `Date: ${forecast.date || 'N/A'}<br>`;
                html += `Location: ${forecast.lat && forecast.lon ? `${forecast.lat.toFixed(2)}, ${forecast.lon.toFixed(2)}` : 'N/A'}<br>`;
                html += `${forecast.modelA?.name || 'Model A'}: ${forecast.modelA?.prob !== undefined ? forecast.modelA.prob + '% rain' : 'N/A'}<br>`;
                html += `${forecast.modelB?.name || 'Model B'}: ${forecast.modelB?.prob !== undefined ? forecast.modelB.prob + '% rain' : 'N/A'}`;
            } else {
                html += 'No daily forecasts stored yet. Will save on next visit.';
            }
            html += '</div>';
            
            // All localStorage Keys
            html += '<div style="margin-bottom: 15px;"><strong>🔑 All Stored Keys:</strong></div>';
            html += '<div style="background: #f5f5f5; padding: 10px; border-radius: 6px; margin-bottom: 15px; overflow-x: auto;">';
            if (cacheData.allKeys.length > 0) {
                html += cacheData.allKeys.map(k => `<div>• ${k}</div>`).join('');
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
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: #718096; margin-top: 12px; padding-top: 12px; border-top: 1px solid #edf2f7;">
                    <span>📅 ${formattedEvent.formattedDate}</span>
                    ${formattedEvent.link !== '#' ? `<a href="${formattedEvent.link}" target="_blank" style="color: #3182ce; text-decoration: none;">🔗 Learn more →</a>` : ''}
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
                highDiff > 0 ? `<span style="color: #e53e3e;">▲ ${highDiff}° above average</span>` :
                highDiff < 0 ? `<span style="color: #3182ce;">▼ ${Math.abs(highDiff)}° below average</span>` :
                `<span style="color: #718096;">at average</span>`;
                
            const lowComparison = lowDiff === null ? '' :
                lowDiff > 0 ? `<span style="color: #e53e3e;">▲ ${lowDiff}° above average</span>` :
                lowDiff < 0 ? `<span style="color: #3182ce;">▼ ${Math.abs(lowDiff)}° below average</span>` :
                `<span style="color: #718096;">at average</span>`;

            ELEMENTS.historicalNormalsContent.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div style="background: #f7fafc; padding: 12px; border-radius: 6px;">
                        <div style="font-size: 0.8rem; color: #718096; margin-bottom: 4px;">Average High</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #e53e3e;">${avgHigh}°</div>
                        ${todayHigh !== null ? `<div style="font-size: 0.85rem; margin-top: 4px;">Today: ${Math.round(todayHigh)}° ${highComparison}</div>` : ''}
                    </div>
                    <div style="background: #f7fafc; padding: 12px; border-radius: 6px;">
                        <div style="font-size: 0.8rem; color: #718096; margin-bottom: 4px;">Average Low</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #3182ce;">${avgLow}°</div>
                        ${todayLow !== null ? `<div style="font-size: 0.85rem; margin-top: 4px;">Today: ${Math.round(todayLow)}° ${lowComparison}</div>` : ''}
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 0.85rem;">
                    <div>
                        <span style="color: #718096;">Record High:</span> <strong style="color: #e53e3e;">${recordHigh}°</strong>
                    </div>
                    <div>
                        <span style="color: #718096;">Record Low:</span> <strong style="color: #3182ce;">${recordLow}°</strong>
                    </div>
                </div>
                <div style="font-size: 0.75rem; color: #a0aec0; margin-top: 12px; text-align: right;">
                    Based on ${normals.yearsOfData} years of data • 
                    <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener" style="color: #3182ce; text-decoration: none;">Data: Open-Meteo Archive API</a>
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
                }
            });

            // Focus input on click
            ELEMENTS.citySearchInput.addEventListener('click', (e) => {
                e.stopPropagation();
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
                <div class="city-result-item" 
                     data-lat="${city.lat}" 
                     data-lon="${city.lon}" 
                     data-name="${city.name}"
                     data-region="${city.region}"
                     style="padding: 12px; cursor: pointer; border-bottom: 1px solid #edf2f7; transition: background 0.2s;"
                     onmouseover="this.style.background='#f7fafc'" 
                     onmouseout="this.style.background='white'">
                    <div style="font-weight: 600; color: #2d3748;">${city.name}</div>
                    <div style="font-size: 0.85rem; color: #718096;">${city.region ? city.region + ', ' : ''}${city.country}</div>
                </div>
            `).join('');

            ELEMENTS.citySearchResults.innerHTML = html;
            ELEMENTS.citySearchResults.style.display = 'block';

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
                    
                    if (onCitySelect) {
                        onCitySelect(lat, lon, cityName);
                    }
                });
            });
        },

        /**
         * Get element reference (for debugging)
         */
        getElement(id) {
            return ELEMENTS[id];
        }
    };
})();
