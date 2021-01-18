import { createRequire } from 'module';
import { calculateCLS, calculateFCP, calculateLCP, calculateFID, calculateTTI } from './calculator.js';
import { processFile } from './app_provider.js';
import { generateReport } from './report_generator.js';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');

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

async function navigateToURL() {
    page = await browser.newPage();
    const client = await page.target().createCDPSession()

    // Set throttling property
    await client.send('Network.emulateNetworkConditions', {
        'offline': false,
        'downloadThroughput': 4 * 1024 * 1024 / 8,
        'uploadThroughput': 3 * 1024 * 1024 / 8,
        'latency': 20
    });
    await client.send('Network.enable');
    await client.send('ServiceWorker.enable');
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    const navigationPromise = page.waitForNavigation();

    await page.evaluateOnNewDocument(calculateCLS);
    await page.evaluateOnNewDocument(calculateFCP);
    await page.evaluateOnNewDocument(calculateFID);
    await page.evaluateOnNewDocument(calculateLCP);
    await page.evaluateOnNewDocument(calculateTTI);


    await page.goto('http://bbc.com', { waitUntil: 'load', timeout: 60000 });
    //await page.addScriptTag({ url: 'https://unpkg.com/web-vitals' })

    await navigationPromise;

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

}

async function getMetrics(name) {
    //insert all calculations in page
    //get metrcis by metrci, compose in metrics json array
    let cls = await page.evaluate(() => {
        return window.cls;
    });
    console.log('CLS:', cls);

    let fid = await page.evaluate(() => {
        return window.fid;
    });
    console.log('FID:', fid);

    let fcp = await page.evaluate(() => {
        return window.fcp;
    });
    console.log('FCP:', fcp);

    let lcp = await page.evaluate(() => {
        return window.lcp;
    });
    console.log('LCP:', lcp);
    
    let result = { 
        name: name,
        FCP: fcp, 
        LCP: lcp,
        FID: fid,
        CLS: cls 
    };
    let data = JSON.stringify(result);
    fs.writeFileSync('student-2.json', data);
    return result;

}

async function shutdownBrowser() {
    await browser.close();
}

async function main() {
    await launchBrowser();

    let appData = processFile();
    for(let item in appData) {
        console.log(item)
    }
    await navigateToURL();


    await page.type('#orb-search-q', 'Fleetwood Mac Dreams')
    getMetrics('bla');


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
    

    shutdownBrowser();
}
//lighthouseFromPuppeteer("https://bbc.com", options);

main();
