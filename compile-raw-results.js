// ================================================
// compile-raw-results.js
// Convert raw-results.json -> draws-data.js
// EurekaLott
// ================================================

const fs = require("fs");
const path = require("path");

const RAW_FILE = path.join(__dirname, "raw-results.json");
const OUTPUT_FILE = path.join(__dirname, "draws-data.js");

function compileRawResults() {

    if (!fs.existsSync(RAW_FILE)) {
        console.log("No raw-results.json");
        return;
    }

    const raw = JSON.parse(
        fs.readFileSync(RAW_FILE, "utf8")
    );

    const output = `
// AUTO GENERATED
// DO NOT EDIT

window.VIETLOTT_RAW_RESULTS = ${JSON.stringify(raw, null, 4)};
`;

    fs.writeFileSync(
        OUTPUT_FILE,
        output
    );

    console.log("✅ draws-data.js updated.");
}

if (require.main === module) {
    compileRawResults();
}

module.exports = {
    compileRawResults
};
