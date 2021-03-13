import { createRequire } from 'module';
const require = createRequire(import.meta.url);


const fs = require('fs');

var results = [];
const metrics = ['FCP', 'LCP', 'TTI', 'CLS', 'TBT', 'FID'];

generateReport();
function readResults(filename) {
    var rawdata = fs.readFileSync(filename);
    results = JSON.parse(rawdata);
}

export function generateReport() {
    //readResults();
    var fileName = 'results.html';
    var stream = fs.createWriteStream(fileName);

    stream.once('open', function (fd) {
        var html = buildHtml();

        stream.end(html);
    });
}

 function buildHtml() {
    var header = '<link rel=\'stylesheet\' href=\'styles.css\'>';
    readResults('resultPage1.json');
    var body = '<p>Results for page 1</p><div>';
    var table1 = generateTable();
    body += table1;
    body += '</div>';

    readResults('resultPage2.json');
    body += '<p>Results for page 2</p><div>';
    var table2 = generateTable();
    body += table2;
    body += '</div>';

    readResults('resultPage3.json');
    body += '<p>Results for page 3</p><div>';
    var table2 = generateTable();
    body += table2;
    body += '</div>';

    // concatenate header string
    // concatenate body string

    return '<!DOCTYPE html>'
        + '<html><head>' + header + '</head><body><div>' + body + '</div></body></html>';
}

function generateTable() {
    // extract values for header

    var col = ['metrics/ frameworks'];
    for (var i = 0; i < results.length; i++) {
        for (var key in results[i]) {
            if (key === 'name') {
                if (col.indexOf(results[i][key]) === -1) {
                    col.push(results[i][key]);
                }
            }
        }
    }

    var table = '<table>';

    // create table header
    var tr = '<tr>';                   // row

    for (var i = 0; i < col.length; i++) {
        var th = '<th>';      // header
        th += col[i];
        th += '</th>'
        tr += th;
    }
    tr += '</tr>';
    table += tr;

    // add data as rows
    for (var i = 0; i < metrics.length; i++) {
        var trKey = '<tr>';
        var tabCell = '<td>'
        tabCell += metrics[i];
        tabCell += '</td>';
        trKey += tabCell
        for (var j = 0; j < results.length; j++) {
            var cell = '<td>'
            for (const [key, value] of Object.entries(results[j][metrics[i]])) {
                    cell += `${key}: ${value}`;
                    cell+= '<br>';
            }
            cell += '</td>';
            trKey += cell;
        }
        trKey += '</tr>'
        table += trKey;
    }
    table += '</table>';
    return table;

}

