/**
 * Created by Doge on 1/16/2017.
 */
var mongoose = require('mongoose');

module.exports = {};

var wTogDB = mongoose.createConnection(`mongodb://${process.env.MONGO_LOGIN}:${process.env.MONGO_PW}@${process.env.MONGO_IP}:27017/welcometoggle?authSource=admin`);
wTogDB.on('error', console.error.bind(console, 'connection error:'));
wTogDB.once('open', function () {
    console.log("Welcome Toggle DB connected.");
});
var wTogS = mongoose.Schema({
    guildID: String,
    toggle: Boolean
});
var welcomeToggle = wTogDB.model('welcomeToggle', wTogS);

function getWelcomeToggle(id, callback) {
    //callback with is toggled
    welcomeToggle.findOne({guildID: id}, function(err, toggle) {
       if (err) {
           callback(false);
       } else if (toggle == null) {
           callback(true);
       } else {
           callback(toggle.toggle);
       }
    });
}
module.exports.getWelcomeToggle = getWelcomeToggle;

function setWelcomeToggle(id, truefalse, callback) {
    //callback with success, new toggle
    //truefalse is 0 (false) 1 (true) 2/else (change)
    function getTrueFalse(isNew, alrdy) {
        if (truefalse == "0") {
            return false;
        } else if (truefalse == "1") {
            return true;
        } else if (isNew) {
            return false;
        }
        return !alrdy;
    }
    welcomeToggle.findOne({guildID: id}, function(err, toggle) {
        if (err) {
            callback(false);
        } else if (toggle == null) {
            var toggleSet = getTrueFalse(true);
            var newToggle = new welcomeToggle({guildID:id, toggle:toggleSet});
            newToggle.save(function(err, ret) {
               callback(!err, toggleSet);
            });
        } else {
            toggle.toggle = getTrueFalse(false, toggle.toggle);
            toggle.save(function(err, ret) {
                callback(!err, toggle.toggle);
            });
        }
    });
}

function toggleWelcomeToggle(id, args, callback) {
    if (!id) {callback(false);}
    var setTrueFalse = "2";
    if (args.length > 1) {
        setTrueFalse = "0";
        var boolKey = args[1].toLowerCase();
        if (["on", "true", "1"].indexOf(boolKey) > -1) {
            setTrueFalse = "1";
        }
    }
    setWelcomeToggle(id, setTrueFalse, callback);
}
module.exports.welcomeToggle = toggleWelcomeToggle;