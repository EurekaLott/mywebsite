const raw = `

`;

function normalize(text){

    return text
        .replace(/│/g," ")
        .replace(/\|/g," ")
        .replace(/\t/g," ")
        .replace(/\s+/g," ")
        .trim();

}

const source = normalize(raw);

console.log(source);
function parseBlocks(text){

    const lines = text
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(x => x !== "");

    const blocks = [];

    let current = null;

    for(const line of lines){

        if(/^\d{4}[- ]\d{2}[- ]\d{2}$/.test(line)){

            current = {
                date: line.replace(/ /g,"-"),
                rows: []
            };

            blocks.push(current);

            continue;

        }

        if(current){

            current.rows.push(line);

        }

    }

    return blocks;

}

const blocks = parseBlocks(source);

console.log(blocks); 
function splitPairs(value){

    const pairs = value.match(/\d{2}/g);

    if(!pairs || pairs.length !== 5){

        return null;

    }

    return pairs.map(Number);

}

for(const block of blocks){

    console.log("DATE:", block.date);

    for(const row of block.rows){

        const nums = row.match(/\d{10}/g);

        if(!nums || nums.length < 3){

            continue;

        }

        const left = splitPairs(nums[0]);

        const latest = splitPairs(nums[1]);

        const right = splitPairs(nums[2]);

        console.log({

            left,

            latest,

            right

        });

    }

}
function extractSignals(left,latest,right){

    return{

        leftForecast:{

            ai:[
                left[2],
                left[3]
            ],

            latest:[
                latest[1],
                latest[2]
            ]

        },

        rightForecast:{

            latest:[
                latest[2],
                latest[3]
            ],

            ai:[
                right[1],
                right[2]
            ]

        }

    };

}

for(const block of blocks){

    for(const row of block.rows){

        const nums=row.match(/\d{10}/g);

        if(!nums || nums.length<3){

            continue;

        }

        const left=splitPairs(nums[0]);
        const latest=splitPairs(nums[1]);
        const right=splitPairs(nums[2]);

        if(!left || !latest || !right){

            continue;

        }
const signals = extractSignals(left, latest, right);

        console.log({

    date: block.date,

    leftForecast: signals.leftForecast,

    rightForecast: signals.rightForecast

});

    }

}
function validWhiteBall(n){

    return Number.isInteger(n) && n>=1 && n<=69;

}

function isValidPair(pair){

    return (

        validWhiteBall(pair[0]) &&
        validWhiteBall(pair[1])

    );

}



const validForecasts=[];

for(const block of blocks){

    for(const row of block.rows){

        const nums=row.match(/\d{10}/g);

        if(!nums || nums.length<3){

            continue;

        }

        const left=splitPairs(nums[0]);
        const latest=splitPairs(nums[1]);
        const right=splitPairs(nums[2]);

        if(!left || !latest || !right){

            continue;

        }

        const signals = extractSignals(left, latest, right);

if(isValidPair(signals.leftForecast.ai) &&
   isValidPair(signals.leftForecast.latest)){

    validForecasts.push({

        date: block.date,

        side: "LEFT",

        latest,

        ai: signals.leftForecast.ai,

        latestPair: signals.leftForecast.latest

    });

}

if(isValidPair(signals.rightForecast.latest) &&
   isValidPair(signals.rightForecast.ai)){

    validForecasts.push({

        date: block.date,

        side: "RIGHT",

        latest,

        latestPair: signals.rightForecast.latest,

        ai: signals.rightForecast.ai

    });

}

    }

}

console.log(validForecasts);
function groupByDate(records){

    const map = new Map();

    for(const item of records){

        if(!map.has(item.date)){

            map.set(item.date,[]);

        }

        map.get(item.date).push(item);

    }

    return map;

}

const groupedForecasts = groupByDate(validForecasts);

console.log(groupedForecasts);
function formatDate(date){

    return date.toISOString().slice(0,10);

}

for(const [date,records] of groupedForecasts){

    console.log("----------------------");

    console.log("Latest Drawing :",date);

    console.log("Forecast Date  :",formatDate(
        getNextDrawDate("powerball",date)
    ));

    console.log("Signals:",records.length);

}
function buildForecastText(grouped){

    let output = "const forecast = `\n\n";

    for(const [date,records] of grouped){

        const forecastDate = formatDate(
            getNextDrawDate("powerball",date)
        );

        output += forecastDate + "\n\n";

        const leftRecords = records.filter(r => r.side === "LEFT");
const rightRecords = records.filter(r => r.side === "RIGHT");

if(leftRecords.length){

    output += "LEFT\n";

    for(const item of leftRecords){

        output +=
            item.ai.join(" ") +
            "   " +
            item.latestPair.join(" ") +
            "\n";

    }

    output += "\n";

}

if(rightRecords.length){

    output += "RIGHT\n";

    for(const item of rightRecords){

        output +=
            item.latestPair.join(" ") +
            "   " +
            item.ai.join(" ") +
            "\n";

    }

    output += "\n";

}

        output += "\n";

    }

    output += "`;";

    return output;

}

const forecastText = buildForecastText(groupedForecasts);

console.log(forecastText);
