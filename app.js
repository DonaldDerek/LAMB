var request = require('request');
var parseString = require('xml2js').parseString;
var _ = require('underscore');
var config = require('./config');

var serialport = require("serialport");
var SerialPort = serialport.SerialPort;

var spawn = require('child_process').spawn;

//Use config file to importa email and password, if not you can still hardcode it here.
var username = config.email;
var password = config.password;
var macSerial = "/dev/tty.usbmodem1411";
var piSerial = "/dev/ttyACM0";

var sp = new SerialPort(macSerial, {
  baudrate:115200,
  parser: serialport.parsers.readline("\n")
});

sp.open(function (err) {
  if (err) console.log('failed to open: '+err);
  else console.log('open');
});

function checkMail(callback){
    request.get("https://"+username+":"+password+"@mail.google.com/gmail/feed/atom", function(error, response, body){
        if(error)console.log(error);
        var xml = body;
        parseString(xml, function (err, result) {
            if(err) console.log(err);
            if (result !== undefined){
                var msgs = result.feed.entry;
                _.each(msgs, function(msg, i){
                    var id = msg.id[0];
                    if(i == 0)
                        return callback(msg);
                })
            }
        });
    })
}
var msgID=0;
var intID=0;
var emailMsg = "Email Not Found";
setInterval(function () {
    checkMail(function(data){
        var id = data.id[0].split(":")[2];
        msgID = id;
        if(intID !== msgID && intID!==0 && msgID!==0){
            console.log("You got mail!");
            var emailType = data.author[0].email[0].split('@')[1];
            var authorName = data.author[0].name[0];
            var title = data.title;

            if(emailType == "gmail.com")
                sp.write("Gmail#");
            if(emailType == "mit.edu" || emailType == "media.mit.edu" )
                sp.write("MIT#");

            sp.on('data', function(data) {
                console.log(data);
                var play = (new Buffer(data,'ascii')).toString('binary').charCodeAt(0);
                if (play == '80'){
                    //espeak -ven+m2 -k1 -s120
                    var speak = "\'New email from "+authorName+". Subject "+title+"\'";
                    console.log(speak);
                    //var espeak = spawn('espeak', ['-ven+m2','-k1','-s120',speak]);
                    var espeak = spawn('say', [speak]);
                    espeak.on('close', function (code) {
                        console.log('child process exited with code ' + code);
                    });
                }
            });
        }
    })
    intID=msgID;
}, 2000);
