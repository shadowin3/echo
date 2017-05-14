/**
 * Created by Doge on 1/9/2017.
 */

var request = require("request");

module.exports = {};
var cardData = {};
module.exports.cardData = cardData;

function doesTermMatchCard(term, cardName) {
    return cardData[cardName].searchableText.includes(term.toLowerCase());
}
module.exports.doesTermMatchCard = doesTermMatchCard;

function formatCardData(cards) {
    for (var cardName in cards) {
        if (cards.hasOwnProperty(cardName)) {
            card = cards[cardName];
            cardData[cardName.toLowerCase()] = card;
        }
    }
}

function buildCardData(callback) {
    request("http://sv.bagoum.com/cardsFullJSON", function (err, resp, body) {
        if (err) {
            return callback(err);
        }
        if (resp.statusCode != 200) {
            return callback("Invalid status code: " + resp.statusCode);
        }
        var cards = JSON.parse(body.replace(/\<br\>/g, "\\n"));
        formatCardData(cards);
        return callback(null);
    });
}
module.exports.buildCardData = buildCardData;