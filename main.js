'use strict'
import { createRequire } from 'module';
import { calculateCLS, calculateFCP, calculateLCP, calculateFID, calculateTTIandTBT } from './calculator.js';
import { getApplications } from './app_provider.js';
import { getSelector } from './workflow_provider.js'
import { generateReport } from './report_generator.js';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');

const fs = require('fs');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const reportGenerator = require('lighthouse/lighthouse-core/report/report-generator');
const request = require('request');
const util = require('util');

//let browser;
var page;
const counter = 2;
const metrics = ["FCP", "LCP", "FID", "TBT", "CLS"];
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

const launchChromeBrowser = async () => {
    const chrome = await chromeLauncher.launch(options);
    options.port = chrome.port;

    // Connect chrome-launcher to puppeteer
    const resp = await util.promisify(request)(`http://localhost:${options.port}/json/version`);
    const { webSocketDebuggerUrl } = JSON.parse(resp.body);
    let browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });
    page = await browser.newPage();

    setNetworkConditions();
    return browser;
}

async function launchBrowser() {
    let browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome-stable", headless: false });
    page = await browser.newPage();

    setNetworkConditions();

    return browser;
}

const setNetworkConditions = async () => {
    const client = await page.target().createCDPSession()

    // Set network conditions
    await client.send('Network.emulateNetworkConditions', {
        'offline': false,
    'downloadThroughput': 1.5 * 1024 * 1024 / 8,
    'uploadThroughput': 750 * 1024 / 8,
    'latency': 40
    });
    await client.send('Network.enable');
    await client.send('ServiceWorker.enable');
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}

const injectComputations = async () => {
    await page.evaluate(calculateCLS);
    await page.evaluate(calculateFCP);
    await page.evaluate(calculateFID);
    await page.evaluate(calculateLCP);
    await page.evaluate(calculateTTIandTBT);
}

async function navigateToURL(url) {

    const navigationPromise = page.waitForNavigation({
        waitUntil: 'networkidle0',
        timeout: 100000
    });


    await page.goto(url);
    //await page.addScriptTag({ url: 'https://unpkg.com/web-vitals' })
    await injectComputations();


    await navigationPromise;

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
}

async function getMetrics() {
    //await page.waitForTimeout(10000);
    //get metrcis by metrci, compose in metrics json array
    let cls = await page.evaluate(() => {
        return window.cls;
    });

    let fid = await page.evaluate(() => {
        return window.fid;
    });

    let fcp = await page.evaluate(() => {
        return window.fcp;
    });

    let lcp = await page.evaluate(() => {
        return window.lcp;
    });

    let tbt = await page.evaluate(() => {
        return window.tbt;
    });

    let tti = await page.evaluate(() => {
        return window.tti;
    });

    let allMetrics = {
        FCP: Math.round(fcp * 100) / 100,
        LCP: Math.round(lcp * 100) / 100,
        FID: Math.round(fid * 100) / 100,
        TBT: Math.round(tbt * 100) / 100,
        TTI: Math.round(tti * 100) / 100,
        CLS: Math.round(cls * 100) / 100
    };
    return allMetrics;
}

async function shutdownBrowser(browser) {
    await browser.close();
}

const analysis = (data) => {
    let minValue = Math.min(...data);
    let maxValue = Math.max(...data);
    let mean = data.reduce((a, b) => a + b) / data.length;
    let variance = data.map(function (num) {
        return Math.pow(num - mean, 2);
    }).reduce((a, b) => a + b) / data.length;


    let result = {
        min: minValue,
        max: maxValue,
        mean: Math.round(mean * 100) / 100,
        variance: Math.round(variance * 100) / 100
    };
    return result;
}
async function main() {

    let finalReportPage1 = [];
    let appData = getApplications();
    //iterate all apps
    for (let i = 0; i < appData.length; i++) {
        let resultsPage1 = [];
        let resultsPage2 = [];

        //iterate counter for further analysis
        for (let j = 0; j < counter; j++) {
            //get all metrics and push to results
            let browser = await launchBrowser();
            await navigateToURL(appData[i].url);
            await page.type('#orb-search-q', 'Fleetwood Mac Dreams')
            let currentResults = await getMetrics();
            console.log(currentResults, 'page 1')

            currentResults.name = appData[i].name;
            currentResults.id = j;
            resultsPage1.push(currentResults);


            //navigate to page 2 and perform the same analysis
            // const [response] = await Promise.all([
            //     page.waitForNavigation({
            //         waitUntil: 'networkidle0',
            //     }),
            //     page.click(".orb-nav-newsdotcom"),
            // ]);
            // console.log(page.url());
            // await setNetworkConditions();
            // await page.type('#orb-search-q', 'Fleetwood Mac Dreams')

            // //await page.waitForNavigation();
            // await injectComputations();

            // currentResults = await getMetrics();
            // console.log(currentResults, 'page 2');
            // currentResults.name = appData[i].name;
            // currentResults.id = j;
            // resultsPage2.push(currentResults);

            await shutdownBrowser(browser);
        }

        finalReportPage1.push({ name: appData[i].name });
        metrics.map(metric => {
            let metricsArr = resultsPage1.map(item => { return item[metric] })
            let res = analysis(metricsArr)
            res.values = metricsArr;
            finalReportPage1[i][metric] = res;
            //console.log(res)
        });

        let dataToWrite = JSON.stringify(resultsPage1);
        fs.writeFileSync(`result ${appData[i].name}.json`, dataToWrite);

    };


    let dataToWrite = JSON.stringify(finalReportPage1);
    fs.writeFileSync(`resultPage1.json`, dataToWrite);
    console.log(finalReportPage1);

}
//lighthouseFromPuppeteer("https://bbc.com", options);

main();
