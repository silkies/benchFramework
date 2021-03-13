import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');

function processConfigFile() {
    let rawdata = fs.readFileSync('workflow_config.json');
    let data = JSON.parse(rawdata);
    return data;
}
export function getPageSelector() {
    let data = processConfigFile();
    return data.selector;
}

export function getInputSelector() {
    let data = processConfigFile();
    return data.input;
}
