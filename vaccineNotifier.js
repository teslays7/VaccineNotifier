require('dotenv').config()
const moment = require('moment');
const cron = require('node-cron');
const axios = require('axios');
const tgBot = require('./telegram-bot');

const AGE = process.env.AGE

async function main(){
    try {
        cron.schedule('* * * * *', async () => {
             await checkAvailability();
       });
    } catch (e) {
        console.log('an error occured: ' + JSON.stringify(e, null, 2));
        throw e;
    }
}

async function checkAvailability() {

    let datesArray = await fetchNext7Days();

    let districts = ['140', '141', '142', '143', '144', '145', '146', '147', '148', '149', '150'];

    districts.forEach(district => {
        datesArray.forEach(date => {
            getSlotsForDate(date, district);
        })
    })
}

function getSlotsForDate(DATE, DISTRICT) {
    let config = {
        method: 'get',
        url: 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/findByDistrict?district_id=' + DISTRICT + '&date=' + DATE,
        headers: {
            'accept': 'application/json',
            'Accept-Language': 'hi_IN',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36'
        }
    };

    axios(config)
        .then(function (slots) {
            //console.log(slots);
            let sessions = slots.data.sessions;
            let validSlots = sessions.filter(slot => slot.min_age_limit <= AGE && slot.available_capacity > 0 && slot.vaccine == 'COVAXIN')
            console.log({date:DATE, validSlots: validSlots.length})
            if(validSlots.length > 0) {
                notifyMe(validSlots, DATE);
                console.log(validSlots);
            }
        })
        .catch(function (error) {
            console.log(error);
        });
}

function createTemplate(slotDetails, date){
    let message = `\n\n
    * * * * * * * * * * * * * * * *
    ℹ Slot found on date ${date} \n\n`;
    for(const slot of slotDetails){
        if (slot.available_capacity < 5) {
            continue;
        }
        let slotBody = `🏦Center Name: ${slot.name}, ${slot.pincode}
        Available Capacity: ${slot.available_capacity}
        Fee Type: ${slot.fee_type}
        Vaccine: ${slot.vaccine}`
        slotBody = `${slotBody} \n`
        message = `${message} ${slotBody}\n`
    }
    return message
}

async function notifyMe(validSlots, date){    
    tgBot.telegrambot(createTemplate(validSlots, date));
};

async function fetchNext7Days(){
    let dates = [];
    let today = moment();
    for(let i = 0 ; i < 7 ; i ++ ){
        let dateString = today.format('DD-MM-YYYY')
        dates.push(dateString);
        today.add(1, 'day');
    }
    return dates;
}


main()
    .then(() => {console.log('Vaccine availability checker started.');});
