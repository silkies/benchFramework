import { createRequire } from 'module';
const require = createRequire(import.meta.url);


const fs = require('fs');

var results = [];
var metrics = ["FCP", "LCP", "TTI", "CLS", "TBT", "FID"];

generateReport();

function readResults() {
    var rawdata = fs.readFileSync('results.json');
    results = JSON.parse(rawdata);
}

function generateReport() {
    readResults();
    var fileName = 'result.html';
    var stream = fs.createWriteStream(fileName);

    stream.once('open', function (fd) {
        var html = buildHtml();

        stream.end(html);
    });
}

function buildHtml() {
    var header = '';
    var body = generateTable();

    // concatenate header string
    // concatenate body string

    return '<!DOCTYPE html>'
        + '<html><head>' + header + '</head><body>' + body + '</body></html>';
}

function generateTable() {
    // EXTRACT VALUE FOR HTML HEADER. 

    var col = ['frameworks/metrics'];
    for (var i = 0; i < results.length; i++) {
        for (var key in results[i]) {
            if (key === 'name') {
                if (col.indexOf(results[i][key]) === -1) {
                    col.push(results[i][key]);
                }
            }
        }
    }

    // CREATE DYNAMIC TABLE.
    var table = '<table>';

    // CREATE HTML TABLE HEADER ROW USING THE EXTRACTED HEADERS ABOVE.

    var tr = '<tr>';                   // TABLE ROW.

    for (var i = 0; i < col.length; i++) {
        var th = '<th>';      // TABLE HEADER.
        th += col[i];
        th += '</th>'
        tr += th;
    }
    tr += '</tr>';
    table += tr

    // ADD JSON DATA TO THE TABLE AS ROWS.

    for (var i = 0; i < metrics.length; i++) {
        var trKey = '<tr>';
        var tabCell = '<td>'
        tabCell += metrics[i];
        console.log(metrics[i]);
        tabCell += '</td>';
        trKey += tabCell
        for (var j = 0; j < results.length; j++) {
            var cell = '<td>'
            cell += results[j][metrics[i]];
            cell += '</td>';
            trKey += cell;
        }
        trKey += '</tr>'
        table += trKey;
    }
    return table

}

