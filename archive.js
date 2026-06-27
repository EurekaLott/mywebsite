const fs = require("fs");
const { execSync } = require("child_process");

const FORECAST_FILE = "forecast-data.js";
const ARCHIVE_FILE = "archive-data.js";

function getPreviousForecast() {
    try {
        return execSync(`git show HEAD~1:${FORECAST_FILE}`, {
            encoding: "utf8"
        });
    } catch (e) {
        console.log("Không tìm thấy forecast của commit trước.");
        process.exit(0);
    }
}

function getCurrentArchive() {
    return fs.readFileSync(ARCHIVE_FILE, "utf8");
}

function extractForecast(text) {

    const match = text.match(/`([\s\S]*?)`/);

    if (!match) return null;

    const body = match[1].trim();

    const lines = body
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(x => x !== "");

    const date = lines.shift();

    return {
        date,
        rows: lines.join("\n")
    };
}

const previousForecastText = getPreviousForecast();

const previousForecast = extractForecast(previousForecastText);

if (!previousForecast) {

    console.log("Forecast không hợp lệ.");

    process.exit(0);

}

let archiveText = getCurrentArchive();

if (archiveText.includes(`date: "${previousForecast.date}"`)) {

    console.log("Forecast đã có trong archive.");

    process.exit(0);

}

const newBlock = `{
date: "${previousForecast.date}",

rows: \`

${previousForecast.rows}

\`
},

`;

archiveText = archiveText.replace(

"const archive = [",

`const archive = [

${newBlock}`

);

fs.writeFileSync(

ARCHIVE_FILE,

archiveText,

"utf8"

);

console.log("Archive updated.");
