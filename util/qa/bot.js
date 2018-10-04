// QA Test
// Run this demo: `node bot.js [CLIENT_NAME]`

// This would just be require("rivescript") if not for running this
// example from within the RiveScript project.
var RiveScript = require('../../lib/rivescript')
  , request = require('request-promise')
  , fs = require('fs')
  , _ = require('lodash')
  , q = require('q')
  , client = process.argv[2]
  , config = _.get(require('./config.js'), client)
  , MATCH_THRESHOLD = 5
  , REQUIRED_KEYS = ['airtableUrl', 'airtableKey', 'filePath']
  , bot
  ;

// Create a prototypical class for our own chatbot.
var QABot = function(onReady) {
    // Because `this` changes with each function call in JS, it's good practice
    // to alias it as `self` so that sub-functions can still refer to the parent
    // scope.
    var self = this;

    // Muting warnings since we're not testing for script errors
    self.rs = new RiveScript({onDebug: function () {} });

    // Load the replies and process them.
    self.rs.loadFile(config.filePath, function() {
        self.rs.sortReplies();
        onReady();
    });

    // This is a function for a user requesting a reply. It just proxies through
    // to RiveScript.
    self.getReply = function(username, message) {
        // mimic Dexter's _rawMsgText functionality
        self.rs.setUservar(username, '_rawMsgText', message);

        // When we call RiveScript's getReply(), we pass `self` as the scope
        // variable which points back to this ScopedBot object. This way, JS
        // object macros from the RiveScript code are able to reference this
        // bot object using `this` and call other functions and variables.
        return self.rs.reply(username, message, self);
    };
};

function loadFile() {
  var scriptUrl = 'https://bots.rundexter.com/api/v2/bot/' + config.botId
    + '/?action=dumpScript&api_key=' + config.botKey;

  return request(scriptUrl)
  .then(script => {
    fs.writeFile(config.filePath, script, function(err) {
      if (err) {
        console.error('Failed to write file', config.filePath, err);
      }
    });
  });
}

function prepareResponse(text) {
  return _.trim(text).split(/\s+/).slice(0,MATCH_THRESHOLD).join(" ");
}

function getAirtableResults(offset) {
  return getPage(offset)
  .then(body => {
    findMismatches(body);
    if (body.offset) {
      getAirtableResults(body.offset);
    }
  })
}

function getPage(offset){
  // console.log('offset', offset);
  var options = {
    json: true
    , auth: {
      bearer: config.airtableKey
    }
  }

  if (offset)
    _.set(options, 'qs.offset', offset);

  return request(config.airtableUrl // for debugging only: + '?filterByFormula=Filter%3D"true"'
    , options);
}

function parseVariables(variables, topic) {
  var userVars = _.attempt(JSON.parse.bind({}, variables));
  _.set(userVars, 'topic', topic);
  return userVars;
}

function findMismatches(body) {
  _.each(body.records, function(record) {
    var id = _.get(record, 'id')
      , text = _.trim(_.get(record, ['fields', 'Incoming Text']))
      , topic = _.get(record, ['fields', 'Topic']) || 'random'
      , expected = _.get(record, ['fields', 'Expected Response'])
      , variables, reply
      ;

    if (topic === 'default') topic = 'random';

    // set user variables according to test case
    bot.rs.setUservars('user', parseVariables(_.get(record, ['fields', 'Variables']), topic));
    reply = bot.getReply('user', text);

    if (!_.isEqual(prepareResponse(expected), prepareResponse(reply))) {
      var options = {
        method: 'PATCH'
        , json: true
        , auth: {bearer: config.airtableKey}
        , body: {
          fields: {
            'Success?': 'false'
            , 'Actual Response': reply
          }
        }
      }
      // console.log('// NOT EQUAL:'
      //   + '\nTEXT ('+ topic +')> ' + text 
      //   + '\nEXPECTED> ' + prepareResponse(expected) 
      //   + '\nACTUAL> ' + prepareResponse(reply)
      // );

      request(config.airtableUrl + id, options)
    }
  })
}

if (_.every(REQUIRED_KEYS, _.partial(_.has, config))) {
  console.log('Running script for ' + client);

  loadFile()
  .then(function () {
    bot = new QABot(function() {
      getAirtableResults();
    });    
  })
} else {
  var command = 'node bot.js [CLIENT_NAME]';
  if (client && !config) {
    console.log('ERROR: Invalid client name.\nRun script with valid client: ' + command);
  } else if (!client){ 
    console.log('ERROR: Client name required.\nTo run script: ' + command);
  } else {
    console.log('ERROR: Config missing required one or more required keys.\nUpdate and rerun: ' + command);
  }

} 
