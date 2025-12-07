/**
 * History Module
 * Handles loading and displaying daily historical climate events
 */

const History = (() => {
    let eventsData = [];

    /**
     * Load events from YAML file
     */
    async function loadEvents() {
        try {
            const response = await fetch('daily-events.yml');
            if (!response.ok) {
                throw new Error(`Failed to load events: ${response.status}`);
            }
            const yamlText = await response.text();
            eventsData = parseYAML(yamlText);
            console.log(`Loaded ${eventsData.length} historical events`);
            return eventsData;
        } catch (error) {
            console.error('Error loading historical events:', error);
            return [];
        }
    }

    /**
     * Simple YAML parser for our specific format
     * Parses array of event objects with date, event, country, language, link
     */
    function parseYAML(yamlText) {
        const events = [];
        const lines = yamlText.split('\n');
        let currentEvent = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip comments and empty lines
            if (line.startsWith('#') || line === '' || line === '---') continue;
            
            // New event starts with "- event:"
            if (line.startsWith('- event:')) {
                if (currentEvent) {
                    events.push(currentEvent);
                }
                currentEvent = {
                    event: extractValue(line)
                };
            } else if (currentEvent) {
                // Parse other fields
                if (line.startsWith('date:')) {
                    currentEvent.date = extractValue(line);
                } else if (line.startsWith('country:')) {
                    currentEvent.country = extractValue(line);
                } else if (line.startsWith('language:')) {
                    currentEvent.language = extractValue(line);
                } else if (line.startsWith('link:')) {
                    currentEvent.link = extractValue(line);
                }
            }
        }
        
        // Don't forget the last event
        if (currentEvent) {
            events.push(currentEvent);
        }
        
        return events;
    }

    /**
     * Extract value from YAML line, removing quotes
     */
    function extractValue(line) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) return '';
        
        let value = line.substring(colonIndex + 1).trim();
        
        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        
        return value;
    }

    /**
     * Get event for today's date (month-day)
     * Returns the event matching today's month and day
     */
    function getTodayEvent() {
        if (eventsData.length === 0) {
            return null;
        }

        const today = new Date();
        const todayMonth = today.getMonth() + 1; // 1-12
        const todayDay = today.getDate(); // 1-31

        // Find event matching today's month-day
        const matchingEvent = eventsData.find(event => {
            if (!event.date) return false;
            
            const [year, month, day] = event.date.split('-').map(Number);
            return month === todayMonth && day === todayDay;
        });

        return matchingEvent || null;
    }

    /**
     * Get all events for a specific month-day
     */
    function getEventsForDate(month, day) {
        return eventsData.filter(event => {
            if (!event.date) return false;
            const [y, m, d] = event.date.split('-').map(Number);
            return m === month && d === day;
        });
    }

    /**
     * Format event for display
     */
    function formatEvent(event) {
        if (!event) return null;
        
        const [year, month, day] = event.date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        
        return {
            event: event.event,
            date: event.date,
            year: year,
            formattedDate: date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            country: event.country || 'Global',
            link: event.link || '#'
        };
    }

    return {
        loadEvents,
        getTodayEvent,
        getEventsForDate,
        formatEvent
    };
})();
