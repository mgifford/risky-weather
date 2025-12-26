/**
 * Connection Module
 * Monitors internet connectivity and displays status indicator
 */

const Connection = (() => {
    let isOnline = navigator.onLine;
    const CHECK_INTERVAL = 30000; // Check every 30 seconds
    let lastCheckTime = 0;
    let checkInProgress = false;

    /**
     * Initialize connection monitoring
     */
    function init() {
        // Listen for online/offline events
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initialize indicator with current status
        updateIndicator();

        // Periodic health check
        setInterval(performHealthCheck, CHECK_INTERVAL);
    }

    /**
     * Handle online event
     */
    function handleOnline() {
        isOnline = true;
        updateIndicator();
    }

    /**
     * Handle offline event
     */
    function handleOffline() {
        isOnline = false;
        updateIndicator();
    }

    /**
     * Perform a health check by trying to fetch a lightweight resource
     */
    async function performHealthCheck() {
        if (checkInProgress) return;
        
        const now = Date.now();
        if (now - lastCheckTime < CHECK_INTERVAL) return;
        
        checkInProgress = true;
        lastCheckTime = now;

        try {
            // Try a very lightweight request to a reliable endpoint
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current=temperature_2m', {
                signal: controller.signal,
                method: 'HEAD'
            }).catch(() => null);

            clearTimeout(timeoutId);

            if (response) {
                isOnline = true;
            } else {
                isOnline = false;
            }
        } catch (e) {
            isOnline = false;
        } finally {
            checkInProgress = false;
            updateIndicator();
        }
    }

    /**
     * Update the connection indicator in the DOM
     * Only show when offline for minimal visual clutter
     */
    function updateIndicator() {
        const indicator = document.getElementById('connection-indicator');
        if (!indicator) return;

        if (isOnline) {
            // Hide indicator when online
            indicator.style.display = 'none';
        } else {
            // Show red offline indicator
            indicator.style.display = 'flex';
            const dot = indicator.querySelector('.connection-dot');
            const text = indicator.querySelector('.connection-text');
            dot.style.background = '#f44336'; // Red
            text.textContent = 'Offline';
            indicator.title = 'No internet connection (showing cached data)';
            indicator.setAttribute('aria-label', 'Connection status: Offline');
        }
    }

    /**
     * Get current connection status
     */
    function getStatus() {
        return {
            online: isOnline,
            lastCheck: lastCheckTime,
            checkInterval: CHECK_INTERVAL
        };
    }

    /**
     * Manually trigger a connection check (e.g., when user clicks the indicator)
     */
    async function manualCheck() {
        lastCheckTime = 0; // Force a check
        await performHealthCheck();
    }

    return {
        init,
        getStatus,
        manualCheck,
        isOnline: () => isOnline
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Connection.init);
} else {
    Connection.init();
}
