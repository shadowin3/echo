var Discord = require("discord.js");
var fs = require("fs");
var request = require("request");
var cards = require('./modules/cards');
var display = require('./modules/displayFunc');
var mongo = require('./modules/mongo');
var log = require('./modules/logging');

const bot = new Discord.Client();
var blacklist =[]
var prefix = "-";
var messgQ = {};
var botUserQ = {};
const Q_SIZE = 50;
const DISC_INV = "https://discord.gg/ZJxsfBm";


bot.on("message", msg => {
    if (msg.content.startsWith(prefix) &&
        msg.content.length > 1 && !msg.author.bot) {
        try {
            let args = msg.content.substring(1).split(" ");
            let command = args[0].toLowerCase();
            log.logCommand(msg);
            if (["card-name", "name"].indexOf(command) > -1) {
                cardNameCommand(args, msg, false);
            } else if (["card-search", "card", "search"].indexOf(command) > -1) {
                cardSearchCommand(args, msg, false);
            } else if (["flair"].indexOf(command) > -1) {
                cardSearchCommand(args, msg, false, display.displayFlair);
            } else if (["img"].indexOf(command) > -1) {
                cardSearchCommand(args, msg, false, display.displayImg);
            } else if (["evoimg", "imgevo", "evo"].indexOf(command) > -1) {
                cardSearchCommand(args, msg, true, display.displayImg);
            } else if (["altimg", "imgalt", "alt"].indexOf(command) > -1) {
                cardSearchCommand(args, msg, false, display.displayAltImg);
            } else if (["altevo", "evoalt", "altevoimg"].indexOf(command) > -1) {
                cardSearchCommand(args, msg, true, display.displayAltImg);
            } else if (["voice"].indexOf(command) > -1) {
                cardSearchCommand(args.slice(2), msg, false, display.getVoice.bind(null, args[1], args[2]));
            } else if (["fullart", "full-art", "info"].indexOf(command) > -1) {
                cardSearchCommand(args, msg, false, display.fullCardLink);
            } else if (["deckcode", "code"].indexOf(command) > -1) {
                linkToDeckCode(msg, args[1]);
            } else if (["reddit", "subreddit"].indexOf(command) > -1) {
                linkToReddit(msg);
            } else if (["discord", "do"].indexOf(command) > -1) {
                linkToDiscord(msg);
            } else if (["stream", "streams", "twitch", "strim", "stram"].indexOf(command) > -1) {
                linkToTwitch(msg);
            } else if (["tournament", "tournaments", "tourney", "tourneys", "battlefy"].indexOf(command) > -1) {
                linkToBattlefy(msg);
            } else if (["steam"].indexOf(command) > -1) {
                linkToSteam(msg);
            } else if (memeDict.hasOwnProperty(command)) {
                meme(memeDict[command], msg);
            } else if (msg.member && msg.member.permissions.hasPermission("MANAGE_MESSAGES")) {
                if (command == "clean") {
                    cleanChannel(msg, msg.channel);
                } else if (["welcome"].indexOf(command) > -1) {
                    mongo.welcomeToggle(msg.guild.id, args, showToggled.bind(null, msg));
                } else {
                    cardSearchCommand(["card-search"].concat(args), msg);
                }
            } else {
                cardSearchCommand(["card-search"].concat(args), msg);
            }
        } catch (err) {
            log.log(`Couldn't process ${msg.content} on ${(msg.guild) ? msg.guild.name : "PM"} by ${msg.author.name}`);
        }
    }
});

var memeDict = {
    "sparta":"sv/sparta.jpg"
};

bot.on('ready', () => {
    log.log(`Logged on to ${bot.guilds.map(x => {
        x.fetchMember(bot.user).then(botmember => {
            botUserQ[x.id] = botmember;
        });
        return x.name;
    })}`);
    Array.from(bot.guilds.values()).forEach(x => {
        if (blacklist.indexOf(x.id) > -1) {
            log.log("Found blacklisted guild on login: " + x.name + " " + x.id);
            x.leave();
        }
    });
});
bot.on("guildCreate", (guild) => {
    log.log("Joined " +  guild.name + " " + guild.id);
    if (blacklist.indexOf(guild.id) > -1) {
        log.log("Blacklisted guild! Leaving.");
        guild.leave();
    } else {
        guild.fetchMember(bot.user).then(botmember => {
            botUserQ[guild.id] = botmember;
        });
        sendMessage(guild.defaultChannel, "Echo has successfully joined the server!", true);
    }
});
bot.on("guildMemberAdd", (member) => {
    mongo.getWelcomeToggle(member.guild.id, function (toggle) {
        if (toggle) {
            sendMessage(member.guild.defaultChannel, `Welcome, ${member.user.username}! You have now joined the Shade Empire as a little shade. How cute!`);
        }
    });
});

bot.on("disconnect", () => {
    log.log("Bot disconnected!");
    bot.login("MzEzMDM2OTk0OTMyMzc1NTUy.C_lNRA.ItalXLeUUJ39kNE4Hdhl5DInfYs");
});

//MESSAGE HANDLING

function sendMessage(channel, message, overridePermCheck=false) {
    if (channel instanceof Discord.TextChannel) {
        let gid = channel.guild.id;
        if (!overridePermCheck &&
            (!botUserQ.hasOwnProperty(gid) || !channel.permissionsFor(botUserQ[gid]).hasPermissions(["SEND_MESSAGES"]))) {
            log.log(`Could not send message. Guild: ${channel.guild.name} Channel: ${channel.name}`);
            return;
        }
    }
    channel.sendMessage(message)
        .then(message => {
            addMessageToQueue(channel, message);
        })
        .catch(console.log);
}

function addMessageToQueue(channel, message) {
    let channel_id = channel.id;
    if (!messgQ[channel_id]) {
        messgQ[channel_id] = {
            'index': -1,
            'queue': []
        };
    }
    let queue = messgQ[channel_id];
    queue.index = (queue.index + 1) % Q_SIZE;
    if (queue.queue.length == Q_SIZE) {
        queue.queue[queue.index] = message;
    } else {
        queue.queue.push(message);
    }
}

function cleanChannel(msg, channel) {
    let queue = messgQ[channel.id];
    if (queue) {
        for (var i = 0; i < queue.queue.length; i++) {
            let message = queue.queue[i];
            message.delete();
        }
        messgQ[channel.id] = null;
    }
    sendMessage(
        channel,
        "Cleaned messages, little shade."
    );
}

function showToggled(msg, success, isToggle) {
    if (!success) {
        sendMessage(msg.channel, "Couldn't set welcome toggle, little shade!");
    } else {
        if (isToggle) {
            sendMessage(msg.channel, "Set welcome toggle to ON, little shade.");
        } else {
            sendMessage(msg.channel, "Set welcome toggle to OFF, little shade.");
        }
    }
}

//CARD COMMANDS

function cardNameCommand(args, msg, isEvo) {
    let subname = args.slice(1).join(" ").toLowerCase();
    let cardNames = Object.keys(cards.cardData).filter(function (name) {
        return name.includes(subname);
    });
    outputCards(msg, cardNames, isEvo, display.displayCombatInfo);
}


function cardSearchCommand(args, msg, isEvo, displayFunc = display.displayCombatInfo) {
    let cardNames = Object.keys(cards.cardData); //card names are stored as lower
    givenSearch = args.slice(1).join(" ").toLowerCase();
    for (var ci = 0; ci < cardNames.length; ci++) {
        if (cardNames[ci] == givenSearch) {
            outputCards(msg, [cardNames[ci]], isEvo, displayFunc);
            return;
        }
    }
    for (var i = 1; i < args.length; i++) {
        cardNames = cardNames.filter(function (cardName) {
            return cards.doesTermMatchCard(args[i], cardName);
        });
    }
    outputCards(msg, cardNames, isEvo, displayFunc);
}


function outputCards(msg, cardNames, isEvo, displayFunc) {
    if (cardNames.length == 1) {
        sendMessage(msg.channel, displayFunc(cardNames[0], isEvo));
    } else if (cardNames.length > 1 && cardNames.length <= 32) {
        sendMessage(
            msg.channel,
            "I found these cards, little shade: " +
            cardNames.map(function (cardName) {
                return cards.cardData[cardName].name;
            }).join(", ")
        );
    } else if (cardNames.length > 32) {
        sendMessage(
            msg.channel,
            "I found " + cardNames.length + " cards. That's too many, little shade!"
        );
    } else {
        sendMessage(
            msg.channel,
            "I can't find that card, little shade."
        );
    }
}

//LINK COMMANDS

function linkToDeckCode(msg, code) {
    sendMessage(msg.channel, `Deck for code ${code}: http://sv.bagoum.com/portal/${code}`)
}

function linkToReddit(msg) {
    sendMessage(msg.channel,
        "Shadowverse Subreddit:\n\thttps://www.reddit.com/r/shadowverse/");
}

function linkToDiscord(msg) {
    sendMessage(msg.channel,
        `Shadowverse Discord:\n\t${DISC_INV}`);
}

function linkToTwitch(msg) {
    sendMessage(msg.channel,
        "Shadowverse on Twitch:\n\thttps://www.twitch.tv/directory/game/Shadowverse");
}

function linkToBattlefy(msg) {
    sendMessage(msg.channel,
        "Shadowverse tournaments on Battlefy:\n\t\<https://battlefy.com/excelsior-gaming\>\n" +
        "Shadowverse tournament Discord servers:\n\tNA/EU: https://discord.gg/XggKWNw" +
        "\n\tSEA: https://discord.gg/79Vh6W3");
}

function linkToSteam(msg) {
    sendMessage(msg.channel,
        "Shadowverse on Steam:\n\thttp://store.steampowered.com/app/453480/"
    );
}

function meme(imgLink, msg) {
    sendMessage(msg.channel,
        "http://www.bagoum.com/images/memes/" + imgLink);
}

//INIT

function initializeData(callback) {
    log.log("Starting...");
    cards.buildCardData(function (err) {
        if (err) {
            return callback(err);
        }
        return callback(null);
    });
}

initializeData((err) => {
    if (err) {
        return console.log(err);
    }
    bot.login("MzEzMDM2OTk0OTMyMzc1NTUy.C_lNRA.ItalXLeUUJ39kNE4Hdhl5DInfYs");
});
