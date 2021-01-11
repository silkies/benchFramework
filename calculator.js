

async function calculateFID() {
    window.fid = 0;
    const observer = new PerformanceObserver((entryList) => {
        const firstInput = entryList.getEntries()[0];
    
        // Measure First Input Delay (FID).
        const firstInputDelay = firstInput.processingStart - firstInput.startTime;
        window.fid = firstInputDelay;
        // Log these values the console.
        //console.log('FID', firstInputDelay);
      });
    
      observer.observe({type: 'first-input', buffered: true});
} 

async function calculateFCP() {
    window.fcp = 0;
    var observer = new PerformanceObserver(function(list) {
        var fcp = list.getEntriesByName('first-contentful-paint');
        console.log('fcp', fcp[0].startTime);
    });
    
    // register observer for paint timing notifications
    observer.observe({entryTypes: ["paint"]});
}

async function calculateCLS() {
    window.cls = 0;
    const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
                window.cls += entry.value;
                //console.log('Current CLS value:', window.cls);
            }
        }
    });
    observer.observe({ type: 'layout-shift', buffered: true });

}

async function calculateLCP() {
    window.largestContentfulPaint = 0;

    const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        window.largestContentfulPaint = lastEntry.renderTime || lastEntry.loadTime;
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            observer.takeRecords();
            observer.disconnect();
            console.log('LCP:', window.largestContentfulPaint);
        }
    });
}