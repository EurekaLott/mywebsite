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
function extractSignals(left,right){

    return{

        aiLeft:[
            left[2],   // pos2
            left[4]    // pos4
        ],

        aiRight:[
            right[0],  // pos5
            right[2]   // pos7
        ]

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

        const signals=extractSignals(left,right);

        console.log({

            date:block.date,

            latest,

            aiLeft:signals.aiLeft,

            aiRight:signals.aiRight

        });

    }

}
function validWhiteBall(n){

    return Number.isInteger(n) && n>=1 && n<=69;

}

function isValidSignal(signals){

    return (

        validWhiteBall(signals.aiLeft[0]) &&
        validWhiteBall(signals.aiLeft[1]) &&
        validWhiteBall(signals.aiRight[0]) &&
        validWhiteBall(signals.aiRight[1])

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

        const signals=extractSignals(left,right);

        if(!isValidSignal(signals)){

            continue;

        }

        validForecasts.push({

            date:block.date,

            latest,

            aiLeft:signals.aiLeft,

            aiRight:signals.aiRight

        });

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

