require('dotenv').config()
const fetch = require('node-fetch')
const _ = require('lodash')
const TelegramBot = require('node-telegram-bot-api')
const bot = new TelegramBot(process.env.TELEGRAM_BOT_API)
const currDate = new Date()
const availabilityUrl = `https://retail-pz.cdn-apple.com/product-zone-prod/availability/${currDate.getUTCFullYear()}-${pad(currDate.getUTCMonth()+1)}-${pad(currDate.getUTCDate())}/${pad(currDate.getUTCHours())}/availability.json`
const locationUrl = 'https://www.apple.com/pza-irb/stores?stageRootPath=%2Fsg&lat=1.29&long=103.86'

function getAvailability() {

    let finalAvailability

    fetch(availabilityUrl)
        .then(response => {
            if (response.status !== 200) {
                console.log('Failed getting availability!')
                return
            }
            response.json().then(data => {

                fetch(locationUrl)
                    .then(response => {
                        if (response.status !== 200) {
                            console.log('Failed getting location!')
                            return
                        }
                        response.json().then(stores => {
                            const storeList = stores.en_SG.stores
                            const availabilityList = data.filter(avail => {
                                return storeList.some((store) => {
                                    return store.storeNum === avail.storeNumber
                                })
                            })
                            finalAvailability = joinTwoArrayObjects(availabilityList, storeList)
                            sendTelegramMessage(finalAvailability)
                        })
                    })
            })
        })
        .catch(err => {
            console.log(err)
        })
}

function pad(d) {
    return (d < 10) ? '0' + d.toString() : d.toString();
}

function joinTwoArrayObjects(arr1, arr2) {
    return _.map(arr1, function(item){
        return _.extend(item, _.find(arr2, { storeNum: item.storeNumber }));
    });
}

function sendTelegramMessage(avail) {
    avail.forEach(store => {
        let textMessage
        if (store.appointmentsAvailable) {
            textMessage = `Appointment available at <b>${store.address.title}</b> for the time\n<b>${new Date(store.firstAvailableAppointment*1000).toString()}</b>.\n<a href="https://www.apple.com/sg/retail/instore-shopping-session/">Reserve Now!</a>`
        }
        else {
            textMessage = `Appointment not available at ${store.address.title}`
        }
        bot.sendMessage(
            process.env.CHAT_ID,
            textMessage,
            {
                parse_mode: 'HTML'
            }
        )
    })
}
getAvailability()
