import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');


export function getApplications() {
    let rawdata = fs.readFileSync('app_config.json');
    let applications = JSON.parse(rawdata);
    return applications;
}
