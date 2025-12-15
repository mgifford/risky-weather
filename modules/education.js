/**
 * Education Module
 * Loads lessons from YAML and provides language-filtered access
 */

const Education = (() => {
    let allLessons = [];
    let lessonsCache = {}; // Cache by language

    /**
     * Simple YAML parser for lesson format
     */
    function parseYaml(text) {
        const lessons = [];
        const lines = text.split('\n');
        let current = null;

        for (const line of lines) {
            if (line.trim().startsWith('#') || line.trim() === '') continue;

            if (line.startsWith('- title:')) {
                if (current) lessons.push(current);
                current = { title: line.substring(8).trim().replace(/^["']|["']$/g, '') };
            } else if (current) {
                if (line.trim().startsWith('content:')) {
                    current.content = line.substring(line.indexOf('content:') + 8).trim().replace(/^["']|["']$/g, '');
                } else if (line.trim().startsWith('icon:')) {
                    current.icon = line.substring(line.indexOf('icon:') + 5).trim().replace(/^["']|["']$/g, '');
                } else if (line.trim().startsWith('language:')) {
                    current.language = line.substring(line.indexOf('language:') + 9).trim().replace(/^["']|["']$/g, '');
                }
            }
        }
        if (current) lessons.push(current);
        return lessons;
    }

    /**
     * Load lessons from YAML file
     */
    async function loadLessons() {
        try {
            const response = await fetch('education-lessons.yml');
            const text = await response.text();
            allLessons = parseYaml(text);
            
            // Build language cache
            allLessons.forEach(lesson => {
                const lang = lesson.language || 'en';
                if (!lessonsCache[lang]) lessonsCache[lang] = [];
                lessonsCache[lang].push(lesson);
            });
            
            return allLessons;
        } catch (error) {
            console.error('Failed to load education lessons:', error);
            return [];
        }
    }

    /**
     * Get lessons for current language
     */
    function getLessonsForLanguage(lang = 'en') {
        return lessonsCache[lang] || lessonsCache['en'] || [];
    }

    /**
     * Get a random lesson for current language
     */
    function getRandomLesson(lang = null) {
        const currentLang = lang || I18n.getCurrentLanguage();
        const lessons = getLessonsForLanguage(currentLang);
        if (lessons.length === 0) return null;
        const index = Math.floor(Math.random() * lessons.length);
        return lessons[index];
    }

    /**
     * Get all lessons for current language
     */
    function getAllLessons(lang = null) {
        const currentLang = lang || I18n.getCurrentLanguage();
        return [...getLessonsForLanguage(currentLang)];
    }

    /**
     * Get lesson by index for current language
     */
    function getLessonByIndex(index, lang = null) {
        const currentLang = lang || I18n.getCurrentLanguage();
        const lessons = getLessonsForLanguage(currentLang);
        if (lessons.length === 0) return null;
        return lessons[index % lessons.length];
    }

    /**
     * Get total number of lessons for current language
     */
    function getLessonCount(lang = null) {
        const currentLang = lang || I18n.getCurrentLanguage();
        return getLessonsForLanguage(currentLang).length;
    }

    /**
     * Render the Education section
     */
    async function render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Initial HTML
        container.innerHTML = `
            <div class="card-title">
                <span id="lesson-icon">💡</span>
                <span id="lesson-title" style="flex: 1; margin-left: 10px;" data-i18n="ui.education">Understanding Weather & Risk</span>
                <button id="lesson-cycle-btn" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; padding: 0;" data-i18n-title="education.nextLesson" title="Show next lesson">→</button>
            </div>
            <p id="lesson-content" style="font-size: 0.95rem; color: #444; line-height: 1.6; margin: 0;" data-i18n="ui.loadingLesson">Loading lesson...</p>
            <div style="font-size: 0.8rem; color: #4a5568; margin-top: 12px; text-align: right;">
                <span id="lesson-counter">-- / --</span>
            </div>
        `;

        await loadLessons();
        
        let currentIndex = Math.floor(Math.random() * getLessonCount());
        updateLessonDisplay(currentIndex);

        const btn = container.querySelector('#lesson-cycle-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % getLessonCount();
                updateLessonDisplay(currentIndex);
            });
        }

        function updateLessonDisplay(index) {
            const lesson = getLessonByIndex(index);
            if (!lesson) return;

            const iconEl = container.querySelector('#lesson-icon');
            const titleEl = container.querySelector('#lesson-title');
            const contentEl = container.querySelector('#lesson-content');
            const counterEl = container.querySelector('#lesson-counter');

            if (iconEl) iconEl.textContent = lesson.icon || '💡';
            if (titleEl) titleEl.textContent = lesson.title;
            if (contentEl) contentEl.innerHTML = lesson.content; // Allow HTML in content
            if (counterEl) counterEl.textContent = `${index + 1} / ${getLessonCount()}`;
        }
    }

    return {
        loadLessons,
        getRandomLesson,
        getAllLessons,
        getLessonByIndex,
        getLessonCount,
        render
    };
})();
