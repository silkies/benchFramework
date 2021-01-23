import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');


export function getSelector() {
    let rawdata = fs.readFileSync('workflow_config.json');
    let data = JSON.parse(rawdata);

    return data.selector;
}
