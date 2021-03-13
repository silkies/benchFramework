'use strict'
import { createRequire } from 'module';
import { calculateCLS, calculateFCP, calculateLCP, calculateFID, calculateTTIandTBT } from './calculator.js';
import { getApplications } from './app_provider.js';
import { getPageSelector, getInputSelector } from './workflow_provider.js'
import { generateReport } from './report_generator.js';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');

const fs = require('fs');


var page;
const counter = 10;
const metrics = ["FCP", "LCP", "FID", "TBT", "TTI", "CLS"];

let NETWORK_PRESETS = {
    'GPRS': {
        'offline': false,
        'downloadThroughput': 50 * 1024 / 8,
        'uploadThroughput': 20 * 1024 / 8,
        'latency': 500
    },
    'Regular2G': {
        'offline': false,
        'downloadThroughput': 250 * 1024 / 8,
        'uploadThroughput': 50 * 1024 / 8,
        'latency': 300
    },
    'Good2G': {
        'offline': false,
        'downloadThroughput': 450 * 1024 / 8,
        'uploadThroughput': 150 * 1024 / 8,
        'latency': 150
    },
    'Regular3G': {
        'offline': false,
        'downloadThroughput': 750 * 1024 / 8,
        'uploadThroughput': 250 * 1024 / 8,
        'latency': 100
    },
    'Good3G': {
        'offline': false,
        'downloadThroughput': 1.5 * 1024 * 1024 / 8,
        'uploadThroughput': 750 * 1024 / 8,
        'latency': 40
    },
    'Regular4G': {
        'offline': false,
        'downloadThroughput': 4 * 1024 * 1024 / 8,
        'uploadThroughput': 3 * 1024 * 1024 / 8,
        'latency': 20
    },
    'DSL': {
        'offline': false,
        'downloadThroughput': 2 * 1024 * 1024 / 8,
        'uploadThroughput': 1 * 1024 * 1024 / 8,
        'latency': 5
    },
    'WiFi': {
        'offline': false,
        'downloadThroughput': 30 * 1024 * 1024 / 8,
        'uploadThroughput': 15 * 1024 * 1024 / 8,
        'latency': 2
    }
}

async function launchBrowser() {
    let browser = await puppeteer.launch({
        executablePath: "/usr/bin/google-chrome-stable",
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    page = await browser.newPage();

    setNetworkConditions();

    return browser;
}

async function setNetworkConditions() {
    const client = await page.target().createCDPSession()

    // Set network conditions
    await client.send('Network.emulateNetworkConditions', NETWORK_PRESETS['WiFi']);
    await client.send('Network.enable');
    await client.send('ServiceWorker.enable');
    //await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}

async function injectComputations() {
    await page.evaluate(calculateCLS);
    await page.evaluate(calculateFCP);
    await page.evaluate(calculateFID);
    await page.evaluate(calculateLCP);
    await page.evaluate(calculateTTIandTBT);
}

async function navigateToURL(url) {

    try {
        const navigationPromise = page.waitForNavigation({
            waitUntil: 'networkidle0',
            timeout: 100000
        });
        await page.goto(url, { timeout: 100000 });
        await injectComputations();

        await navigationPromise;
    } catch {

    }
    //page.on('console', msg => console.log('PAGE LOG:', msg.text()));
}

async function getMetrics() {

    let allMetrics = await page.evaluate(() => {
        return {
            FCP: Math.round(window.fcp * 100) / 100,
            LCP: Math.round(window.lcp * 100) / 100,
            FID: Math.round(window.fid * 100) / 100,
            TBT: Math.round(window.tbt * 100) / 100,
            TTI: Math.round(window.tti * 100) / 100,
            CLS: Math.round(window.cls * 100) / 100
        }
    })
    return allMetrics;
}

async function shutdownBrowser(browser) {
    await browser.close();
}

function analysis(data) {
    let minValue = Math.min(...data);
    let maxValue = Math.max(...data);
    let mean = data.reduce((a, b) => a + b) / data.length;
    let variance = data.map(function (num) {
        return Math.pow(num - mean, 2);
    }).reduce((a, b) => a + b) / data.length;
    let std = Math.sqrt(data.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / data.length);
    let cv = std/mean;


    let result = {
        min: minValue,
        max: maxValue,
        mean: Math.round(mean * 100) / 100,
        std: Math.round(std * 100) / 100,
        cv: Math.round(cv * 1000) / 1000
        //variance: Math.round(variance * 100) / 100
    };
    return result;
}

async function getMetricsFromPage(url) {
    await navigateToURL(url);
    await page.type(getInputSelector(), 'input query')
    let currentResults = await getMetrics();

    return currentResults;
}

async function main() {

    let finalReportPage1 = [];
    let finalReportPage2 = [];
    let finalReportPage3 = [];
    let appData = getApplications();
    //iterate all apps
    for (let i = 0; i < appData.length; i++) {
        let resultsPage1 = [];
        let resultsPage2 = [];
        let resultsPage3 = [];

        //iterate counter for further analysis
        for (let j = 0; j < counter; j++) {
            let browser = await launchBrowser();
            //get all metrics and push to results

            let pageRes = await getMetricsFromPage(appData[i].url1);
            pageRes.name = appData[i].name;
            pageRes.id = j;
            resultsPage1.push(pageRes);

            pageRes = await getMetricsFromPage(appData[i].url2)
            pageRes.name = appData[i].name;
            pageRes.id = j;
            resultsPage2.push(pageRes);

            await shutdownBrowser(browser);
        }
        for (let j = 0; j < counter; j++) {
            let browser = await launchBrowser();
            //get all metrics and push to results

            let pageRes = await getMetricsFromPage(appData[i].url2);
            pageRes.name = appData[i].name;
            pageRes.id = j;
            resultsPage3.push(pageRes);
            await shutdownBrowser(browser);
        }

        //metrics analysis for 2 pages
        finalReportPage1.push({ name: appData[i].name });
        finalReportPage2.push({ name: appData[i].name });
        finalReportPage3.push({ name: appData[i].name });

        metrics.map(metric => {
            let metricsArr = resultsPage1.map(item => { return item[metric] });
            let res = analysis(metricsArr)
            res.values = metricsArr;
            finalReportPage1[i][metric] = res;

            metricsArr = resultsPage2.map(item => { return item[metric] });
            res = analysis(metricsArr);
            res.values = metricsArr;
            finalReportPage2[i][metric] = res;

            metricsArr = resultsPage3.map(item => { return item[metric] });
            res = analysis(metricsArr);
            res.values = metricsArr;
            finalReportPage3[i][metric] = res;
        });



        let dataToWrite = JSON.stringify(resultsPage1);
        fs.writeFileSync(`result page 1 ${appData[i].name}.json`, dataToWrite);
        dataToWrite = JSON.stringify(resultsPage2);
        fs.writeFileSync(`result page 2 ${appData[i].name}.json`, dataToWrite);
        dataToWrite = JSON.stringify(resultsPage3);
        fs.writeFileSync(`result page 3 ${appData[i].name}.json`, dataToWrite);

    };


    let dataToWrite = JSON.stringify(finalReportPage1);
    fs.writeFileSync(`resultPage1.json`, dataToWrite);

    dataToWrite = JSON.stringify(finalReportPage2);
    fs.writeFileSync('resultPage2.json', dataToWrite);

    dataToWrite = JSON.stringify(finalReportPage3);
    fs.writeFileSync('resultPage3.json', dataToWrite);

}

main();
