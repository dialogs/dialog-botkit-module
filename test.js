const dlg = require('./index.js');

const controller = dlg({
  debug: true,
  token: process.env.DIALOGS_TOKEN,
  endpoints: [process.env.DIALOGS_ENDPOINT]
});

const bot = controller.spawn({});

controller.hears(/.*/, 'direct_message', (bot, message) => {
  bot.reply(message, 'You sent me a direct message');
});

controller.hears(/.*/, 'ambient', (bot, message) => {
  bot.reply(message, 'I saw a message in this group');
});

controller.hears(/.*/, 'mention', (bot, message) => {
  bot.reply(message, 'Someone mentioned me in this group');
})

controller.hears('convo', 'direct_message', function (bot, message) {

  bot.startConversation(message, function(err, convo) {

      convo.ask('You want to know more about Botkit ?', [
          {
              pattern: bot.utterances.yes,
              callback: function(response, convo) {
                  convo.say('Take a look here https://botkit.ai/docs/');
                  convo.next();
              }
          },
          {
              pattern: bot.utterances.no,
              default: true,
              callback: function(response, convo) {
                  convo.say('No problem');
                  convo.next();
              }
          }
      ]);
  });

});
