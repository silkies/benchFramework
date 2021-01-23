export async function calculateMetrics() {
    await calculateCLS();
    await calculateFCP();
    await calculateLCP();
    await calculateFID();
    await calculateTTI();
}


export async function calculateFID() {
    window.fid = 0;
    const observer = new PerformanceObserver((entryList) => {
        const firstInput = entryList.getEntries()[0];

        // Measure First Input Delay (FID).
        const firstInputDelay = firstInput.processingStart - firstInput.startTime;
        window.fid = firstInputDelay;
        // Log these values the console.
        //console.log('FID', firstInputDelay);
    });

    observer.observe({ type: 'first-input', buffered: true });
}

export async function calculateFCP() {
    window.fcp = 0;
    const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntriesByName('first-contentful-paint')) {
            console.log('FCP candidate:', JSON.stringify(entry));
            window.fcp = entry.startTime;
        }
    });
    observer.observe({ type: 'paint', buffered: true });

}

export async function calculateCLS() {
    window.cls = 0;
    const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
                window.cls += entry.value;
            }
        }
    });
    observer.observe({ type: 'layout-shift', buffered: true });

}

export async function calculateLCP() {
    window.lcp = 0;

    const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        window.lcp = lastEntry.renderTime || lastEntry.loadTime;
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            observer.takeRecords();
            observer.disconnect();
        }
    });
}

export async function calculateTTIandTBT() {
    console.log('here');
    window.tbt = 0;
    window.tti = 0;
    const observer = new PerformanceObserver((list) => {
        var perfEntries = list.getEntries();
        for (var i = 0; i < perfEntries.length; i++) {
            console.log(JSON.stringify(perfEntries[i]));
            window.tbt += perfEntries[i].duration - 50;
            if ((perfEntries[i].startTime + perfEntries[i].duration) > window.tti) {
                window.tti = perfEntries[i].startTime + perfEntries[i].duration;
            }

        }
        console.log(window.tbt, 'tbt')
    });
    observer.observe({ entryTypes: ["longtask"] });

}