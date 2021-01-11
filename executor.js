import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const puppeteer = require('puppeteer');
var web_vitals = require('web-vitals');
var fs = require('fs');
var ttiPolyfill = require('tti-polyfill');

let browser;
let page;
async function launchBrowser() {
    browser = await puppeteer.launch({executablePath: "/usr/bin/google-chrome-stable"});
}

async function navigateToURL(){
    page = await browser.newPage();
    await page.goto('https://youtube.com')
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

}

async function main() {
    launchBrowser();



    shutdownBrowser();
}

async function getLCP() {
    await page.evaluate(calculateLCP);
    let lcp = await page.evaluate(() => {
        return window.largestContentfulPaint;
    });
    return lcp;
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
async function getFCP() {
    let firstContentfulPaint = JSON.parse(
        await page.evaluate(() =>
          JSON.stringify(performance.getEntriesByName('first-contentful-paint'))
        )
      );
      console.log(`First paint: ${firstContentfulPaint[0].startTime}`);
      return firstContentfulPaint[0].startTime;
}

//fcp check
//lcp check
//fid ~ with input action
//tti
//tbt
//cls check


function getTTI() {
    let result = 'nothing'
    ttiPolyfill.getFirstConsistentlyInteractive().then((tti) => {
        result = result + tti;
      });
    return 'result';
}
const measureFirstPagePerformance = async () => {
    browser = await puppeteer.launch({executablePath: "/usr/bin/google-chrome-stable"});

    console.log('function')
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(async() => {!function(){if('PerformanceLongTaskTiming' in window){var g=window.__tti={e:[]};
    g.o=new PerformanceObserver(function(l){g.e=g.e.concat(l.getEntries())});
    g.o.observe({entryTypes:['longtask']})}}()});
    await page.goto('https://youtube.com')
    await page.type('#search', 'Fleetwood Mac Dreams')
    await page.click('button#search-icon-legacy');
    await page.addScriptTag({url: 'https://unpkg.com/web-vitals'})
    await page.addScriptTag({path: '/home/alexa/thesis/projects/bench_frameworks/node_modules/tti-polyfill/tti-polyfill.js'});

    await page.exposeFunction('getTTI', () => getTTI());
    

    await page.evaluate( window.getFirstConsistentlyInteractive())


    await page.evaluate(async() => {
        !function(){if('PerformanceLongTaskTiming' in window){var g=window.__tti={e:[]};
        g.o=new PerformanceObserver(function(l){g.e=g.e.concat(l.getEntries())});
        g.o.observe({entryTypes:['longtask']})}}();

        try {
            // Create the performance observer.
            const po = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                // Log the entry and all associated details.
                console.log(entry.toJSON());
              }
            });
            // Start listening for `longtask` entries to be dispatched.
            po.observe({type: 'longtask', buffered: true});
          } catch (e) {
            // Do nothing if the browser doesn't support this API.
          }

        //const tti = await window.getTTI();
        //console.log(tti);
        
        function sendToGoogleAnalytics({name, delta, id}) {
            // Assumes the global `ga()` function exists, see:
            // https://developers.google.com/analytics/devguides/collection/analyticsjs
            ga('send', 'event', {
              eventCategory: 'Web Vitals',
              eventAction: name,
              // Google Analytics metrics must be integers, so the value is rounded.
              // For CLS the value is first multiplied by 1000 for greater precision
              // (note: increase the multiplier for greater precision if needed).
              eventValue: Math.round(name === 'CLS' ? delta * 1000 : delta),
              // The `id` value will be unique to the current page load. When sending
              // multiple values from the same page (e.g. for CLS), Google Analytics can
              // compute a total by grouping on this ID (note: requires `eventLabel` to
              // be a dimension in your report).
              eventLabel: id,
              // Use a non-interaction event to avoid affecting bounce rate.
              nonInteraction: true,
              // Use `sendBeacon()` if the browser supports it.
              transport: 'beacon',
            });
          }

        addEventListener('DOMContentLoaded', function() {
            webVitals.getCLS(sendToGoogleAnalytics);
            webVitals.getFID(sendToGoogleAnalytics);
            webVitals.getLCP(sendToGoogleAnalytics);
          });
        //fcp

        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntriesByName('first-contentful-paint')) {
                console.log('FCP candidate:', entry.startTime, entry);
            }
        }).observe({ type: 'paint', buffered: true });

        if (window.performance) {
            let performance = window.performance;
            let performanceEntriesPaint = performance.getEntriesByType('paint');
            performanceEntriesPaint.forEach((performanceEntry, i, entries) => {
                console.log("The time to " + performanceEntry.name + " was " + performanceEntry.startTime + " milliseconds.");
            });
        }

        //lcp
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                console.log('LCP candidate:', entry.startTime, entry);
            }
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        //tti
        new PerformanceObserver(function (list) {
            var perfEntries = list.getEntries();
            for (var i = 0; i < perfEntries.length; i++) {
                console.log(JSON.stringify(perfEntries[i]));
            }
        }).observe({ entryTypes: ["longtask"] });

        //fid
        try {
            const po = new PerformanceObserver((entryList) => {
              const firstInput = entryList.getEntries()[0];
          
              // Measure First Input Delay (FID).
              const firstInputDelay = firstInput.processingStart - firstInput.startTime;
          
              // Measure the time it takes to run all event handlers
              // Note: this does not include work scheduled asynchronously using
              // methods like `requestAnimationFrame()` or `setTimeout()`.
              const firstInputProcessingTime = firstInput.processingEnd - firstInput.processingStart;
          
              // Measure the entire duration of the event, from when input is received by
              // the browser until the next frame can be painted after processing all
              // event handlers.
              // Note: similar to above, this value does not include work scheduled
              // asynchronously using `requestAnimationFrame()` or `setTimeout()`.
              // And for security reasons, this value is rounded to the nearest 8ms.
              const firstInputDuration = firstInput.duration;
          
              // Log these values the console.
              console.log('FID', firstInputDelay);
            });
          
            po.observe({type: 'first-input', buffered: true});
          } catch (error) {
            console.log(error)
          }

        //cls
        let cls = 0;

        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                    cls += entry.value;
                    console.log('Current CLS value:', cls);
                }
            }
        }).observe({ type: 'layout-shift', buffered: true });

        console.log('CLS value:', cls);

    });


    await browser.close();
};
await measureFirstPagePerformance();




/*(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://myshows.me/'); // change to your website

  // Executes Navigation API within the page context
  const performanceTiming = JSON.parse(
      await page.evaluate(() => JSON.stringify(window.performance.getEntriesByType("navigation")[0]))
  );
  console.log('performanceTiming', performanceTiming)

  await browser.close();

  const po = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                // Logs all server timing data for this response
            console.log('Time to first byte', entry.responseStart);            }
        });        po.observe({type: 'navigation', buffered: true});



        const perfObserver = new PerformanceObserver((performanceEntryList) => {
  for (const performanceEntry of performanceEntryList.getEntries()) {
    console.log(performanceEntry.name); // 'first-paint' or 'first-contentful-paint'
    console.log(performanceEntry.startTime); // DOMHighResTimeStamp
  }
});
perfObserver.observe({ type: "paint"});
})();
*/