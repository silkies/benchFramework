import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const puppeteer = require('puppeteer');
var web_vitals = require('web-vitals');
var ttiPolyfill = require('tti-polyfill');

const fs = require('fs');
const lighthouse = require('lighthouse');

const chromeLauncher = require('chrome-launcher');
const reportGenerator = require('lighthouse/lighthouse-core/report/report-generator');
const request = require('request');
const util = require('util');

let browser;
let page;

const options = {
    logLevel: 'error',
    disableDeviceEmulation: true,
    chromeFlags: ['--disable-mobile-emulation']
  };


async function lighthouseFromPuppeteer(url, options, config = null) {
    // Launch chrome using chrome-launcher
    const chrome = await chromeLauncher.launch(options);
    options.port = chrome.port;
  
    // Connect chrome-launcher to puppeteer
    const resp = await util.promisify(request)(`http://localhost:${options.port}/json/version`);
    const { webSocketDebuggerUrl } = JSON.parse(resp.body);
    const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });
  
    // Run Lighthouse
    const { lhr } = await lighthouse(url, options, config);
    await browser.disconnect();
    await chrome.kill();
  
    const json = reportGenerator.generateReport(lhr, 'json');
  
    const audits = JSON.parse(json).audits; // Lighthouse audits
    const first_contentful_paint = audits['first-contentful-paint'].displayValue;
    const total_blocking_time = audits['total-blocking-time'].displayValue;
    const time_to_interactive = audits['interactive'].displayValue;
  
    console.log(`\n
       Lighthouse metrics: 
        First Contentful Paint: ${first_contentful_paint}, 
        Total Blocking Time: ${total_blocking_time},
        Time To Interactive: ${time_to_interactive}`);
  }
  

async function launchBrowser() {
    const chrome = await chromeLauncher.launch(options);
    options.port = chrome.port;
  
    // Connect chrome-launcher to puppeteer
    const resp = await util.promisify(request)(`http://localhost:${options.port}/json/version`);
    const { webSocketDebuggerUrl } = JSON.parse(resp.body);
    browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });
    //browser = await puppeteer.launch({executablePath: "/usr/bin/google-chrome-stable"});

}

async function navigateToURL(){
    page = await browser.newPage();
    const navigationPromise = page.waitForNavigation();
    await page.goto('https://bbc.com');
    await page.addScriptTag({url: 'https://unpkg.com/web-vitals'})


    await navigationPromise;

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

}
async function getLCP() {
    await page.evaluate(calculateLCP);
    let lcp = await page.evaluate(() => {
        return window.largestContentfulPaint;
    });
    console.log('LCP:', lcp);

    return lcp;
}

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

async function getFID() {
    await page.evaluate(calculateFID);
    let fid = await page.evaluate(() => {
        return window.fid;
    });
    console.log('FID:', fid);

    return fid;
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
async function getFCP() {
    let firstContentfulPaint = JSON.parse(
        await page.evaluate(() =>
          JSON.stringify(performance.getEntriesByName('first-contentful-paint'))
        )
      );
      console.log('FCP:', firstContentfulPaint[0].startTime);
      return firstContentfulPaint[0].startTime;
}

async function getCLS() {
    await page.evaluate(calculateCLS);
    let cls = await page.evaluate(() => {
        return window.cls;
    });
    console.log('CLS:', cls);

    return cls;
}

async function getTTI() {
    await page.evaluate(async() => {
        new PerformanceObserver(function (list) {
            var perfEntries = list.getEntries();
            for (var i = 0; i < perfEntries.length; i++) {
                console.log(JSON.stringify(perfEntries[i]));
            }
        }).observe({ entryTypes: ["longtask"] });
    })
}

async function getMetrics() {
    //insert all calculations in page
    //get metrcis by metrci, compose in metrics json array
}

async function shutdownBrowser() {
    await browser.close();
}
async function main() {
    await launchBrowser();

    await navigateToURL();

    await getFCP();

    await getLCP();

    await getCLS();

    await page.type('#orb-search-q', 'Fleetwood Mac Dreams')

    await getFID();

    await getTTI();

    const chrome = await chromeLauncher.launch(options);
    options.port = chrome.port;
  
    // Connect chrome-launcher to puppeteer
    
    const { lhr } = await lighthouse("https://bbc.com", options, null);
  
    const json = reportGenerator.generateReport(lhr, 'json');
  
    const audits = JSON.parse(json).audits; // Lighthouse audits
    const first_contentful_paint = audits['first-contentful-paint'].displayValue;
    const total_blocking_time = audits['total-blocking-time'].displayValue;
    const time_to_interactive = audits['interactive'].displayValue;
    const lcp = audits['largest-contentful-paint'].displayValue;

  
    console.log(`\n
       Lighthouse metrics: 
        First Contentful Paint: ${first_contentful_paint}, 
        Total Blocking Time: ${total_blocking_time},
        Time To Interactive: ${time_to_interactive},
        LCP: ${lcp}`);
    /*await page.evaluate(async() => {
        webVitals.getFID((metric) => {

            console.log('webvit fid:', metric.delta);
          });

          webVitals.getTTFB((metric) => {

            console.log('webvit ttfb:', metric.delta);
          });

          const navigationEntry = performance.getEntriesByType('navigation')[0];
          let ttfb = navigationEntry.responseStart
          console.log('ttfb', ttfb)

    })*/

    shutdownBrowser();
}
//lighthouseFromPuppeteer("https://bbc.com", options);

main();

