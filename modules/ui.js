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
        shareBtn: document.getElementById('share-btn')
    };

    let currentLessonIndex = 0;

    return {
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
        renderToday(tempA, probA, tempB, probB) {
            ELEMENTS.valA.innerText = Calculations.formatTemp(tempA);
            ELEMENTS.rainA.innerText = Calculations.formatRain(probA);
            ELEMENTS.valB.innerText = Calculations.formatTemp(tempB);
            ELEMENTS.rainB.innerText = Calculations.formatRain(probB);

            // Add tooltips for today's probabilities
            if (ELEMENTS.rainA) {
                ELEMENTS.rainA.title = Calculations.getProbabilityTooltip(probA);
                ELEMENTS.rainA.style.cursor = 'help';
            }
            if (ELEMENTS.rainB) {
                ELEMENTS.rainB.title = Calculations.getProbabilityTooltip(probB);
                ELEMENTS.rainB.style.cursor = 'help';
            }

            // Calculate and display uncertainty for today if significant
            const tempDiff = Calculations.calculateDisagreement(tempA, tempB);
            const rainDiff = Calculations.calculateDisagreement(probA, probB);
            const uncertaintyLevel = Calculations.getUncertaintyLevel(tempDiff, rainDiff);
            
            if (uncertaintyLevel === 'high') {
                const disagreementMsg = Calculations.getDisagreementTooltip(tempDiff, rainDiff);
                this.setStatus(`⚠️ High uncertainty today: ${disagreementMsg}`);
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
                const probA = Calculations.getSafeData(dailyData, modelA, 'precipitation_probability_max', index);
                const maxB = Calculations.getSafeData(dailyData, modelB, 'temperature_2m_max', index);
                const probB = Calculations.getSafeData(dailyData, modelB, 'precipitation_probability_max', index);

                // Calculate disagreement
                const tempDiff = Calculations.calculateDisagreement(maxA, maxB);
                const rainDiff = Calculations.calculateDisagreement(probA, probB);
                const uncertaintyLevel = Calculations.getUncertaintyLevel(tempDiff, rainDiff);
                const uncertaintyIcon = Calculations.getUncertaintyIcon(uncertaintyLevel);
                const disagreementTooltip = Calculations.getDisagreementTooltip(tempDiff, rainDiff);

                const cellA = Calculations.formatTableCell(probA, maxA);
                const cellB = Calculations.formatTableCell(probB, maxB);

                // Add uncertainty indicator if present
                const uncertaintyBadge = uncertaintyIcon ? 
                    `<span class="uncertainty-badge" title="${disagreementTooltip}" style="cursor: help; margin-left: 4px;">${uncertaintyIcon}</span>` : '';

                html += `<tr>
                    <td class="col-day">${dayName}${uncertaintyBadge}</td>
                    <td title="${Calculations.getProbabilityTooltip(probA)}" style="cursor: help;">${cellA}</td>
                    <td title="${Calculations.getProbabilityTooltip(probB)}" style="cursor: help;">${cellB}</td>
                </tr>`;
            });

            ELEMENTS.forecastList.innerHTML = html;
        },

        /**
         * Render warming stripes visualization
         */
        renderStripes(annualMeans, baseline) {
            ELEMENTS.stripes.innerHTML = '';

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
        renderRealityCheck(date, actuallyRained, rainfall, modelAProbability, modelBProbability, modelAName, modelBName) {
            const rainLabel = actuallyRained ? `Rain (${rainfall}mm)` : 'Dry';

            ELEMENTS.realityContent.innerHTML = `
                <p><strong>Date:</strong> ${date}</p>
                <p>Reality: <strong>${rainLabel}</strong></p>
                <p style="font-size:0.85rem; color:#555;">
                    ${modelAName}: ${modelAProbability}% Risk<br>
                    ${modelBName}: ${modelBProbability}% Risk
                </p>
            `;

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
        initEducation() {
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
            
            // Collect all localStorage data
            const cacheData = {
                location: JSON.parse(localStorage.getItem('user_loc_v6') || 'null'),
                historicalForecasts: JSON.parse(localStorage.getItem('history_v6_pending') || 'null'),
                scoreboard: JSON.parse(localStorage.getItem('scoreboard_v6') || 'null'),
                lastScoredDate: localStorage.getItem('last_scored_date_v6'),
                allKeys: Object.keys(localStorage)
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
            if (cacheData.scoreboard) {
                html += `GEM Regional Wins: ${cacheData.scoreboard.gemRegional || 0}<br>`;
                html += `GEM Global Wins: ${cacheData.scoreboard.gemGlobal || 0}<br>`;
                html += `ECMWF Wins: ${cacheData.scoreboard.ecmwf || 0}<br>`;
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
                html += `Location: ${forecast.city || 'N/A'}<br>`;
                html += `GEM Forecast: ${forecast.gem ? forecast.gem.temp + '°C' : 'N/A'}<br>`;
                html += `ECMWF Forecast: ${forecast.ecmwf ? forecast.ecmwf.temp + '°C' : 'N/A'}`;
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
        updateLanguageToggle() {
            const currentLang = I18n.getCurrentLanguage();
            const nextLang = currentLang === 'en' ? 'fr' : 'en';
            const nextLangName = I18n.getLanguageName(nextLang);
            if (ELEMENTS.languageToggleBtn) {
                ELEMENTS.languageToggleBtn.textContent = I18n.t('ui.toggleLanguage', nextLangName);
            }
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
            if (ELEMENTS.languageToggleBtn) {
                ELEMENTS.languageToggleBtn.addEventListener('click', callback);
            }
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
         * Get element reference (for debugging)
         */
        getElement(id) {
            return ELEMENTS[id];
        }
    };
})();
