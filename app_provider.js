import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');


function processFile() {
    let rawdata = fs.readFileSync('app_config.json');
    let applications = JSON.parse(rawdata);
    console.log(applications[0]); 
}

processFile();