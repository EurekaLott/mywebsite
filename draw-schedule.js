const DRAW_SCHEDULE = {

    powerball: {

    days:[1,3,6]

}

};

function getNextDrawDate(game, latestDate){

    const schedule = DRAW_SCHEDULE[game];

    if(!schedule){

        throw new Error("Unknown game");

    }

    const date = new Date(latestDate);

    while(true){

        date.setDate(date.getDate()+1);

        if(schedule.days.includes(date.getDay())){

            return date;

        }

    }

}
