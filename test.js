const dlg = require('./index.js');

const controller = dlg({
  debug: true,
  token: process.env.DIALOGS_TOKEN,
  endpoints: [process.env.DIALOGS_ENDPOINT]
});

const bot = controller.spawn({});

controller.hears('more', ['direct_mention', 'direct_message'], (bot, message) => {
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

controller.hears('file', ['direct_mention', 'direct_message'], (bot, message) => {
  bot.reply(message, { file: '/etc/services' });
});

controller.hears(/.*/, 'direct_message', (bot, message) => {
  bot.reply(message, 'You sent me a direct message');
});

controller.hears(/.*/, 'ambient', (bot, message) => {
  const sentence = 'I saw a message in this group';
  if (message.text != sentence)
    bot.reply(message, sentence);
});

controller.hears(/.*/, 'mention', (bot, message) => {
  bot.reply(message, 'Someone mentioned me in this group');
});

controller.hears(/.*/, 'direct_mention', (bot, message) => {
  bot.reply(message, 'Someone directly mentioned me in this group');
});

controller.on('bot_group_join', (bot, message) => {
  bot.reply(message, 'Hi, new group!');
});

controller.on('user_group_join', (bot, message) => {
  bot.reply(message, 'A user joined the group');
});

controller.on('user_group_leave', (bot, message) => {
  bot.reply(message, 'A user left the group');
});

controller.on('file_share', (bot, message) => {
  bot.reply(message, 'Someone sent a file');
});
