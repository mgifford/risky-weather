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

    return {
        loadLessons,
        getRandomLesson,
        getAllLessons,
        getLessonByIndex,
        getLessonCount
    };
})();
