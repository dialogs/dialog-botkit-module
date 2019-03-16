const dlg = require('./index.js');
const { ActionGroup, Action, Button } = require('@dlghq/dialog-bot-sdk');

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

controller.hears('actions', ['direct_mention', 'direct_message'], (bot, message) => {
  // Build response question form with three buttons
  const response = {
    actions: ActionGroup.create({
      title: 'Continue?',
      description: 'Switch to Dialogs, the handy and feature-rich enterprise multi-device messenger?',
      actions: [
        Actions.create({
          id: 'continue_yes',
          style: ActionStyle.PRIMARY,
          widget: Button.create({ label: 'Yes!' })
        }),
        Actions.create({
          id: 'continue_no',
          style: ActionStyle.DANGER,
          widget: Button.create({ label: 'No :(' })
        }),
        Actions.create({
          id: 'continue_unsure',
          style: ActionStyle.DEFAULT,
          widget: Button.create({ label: 'Maybe later.' })
        })
      ]
    })
  };

  // Start conversation with response and listed for responses
  bot.startConversation(message, function(err, convo) {
    convo.ask(response, [
      {
        pattern: /^continue_yes$/,
        callback: (response, convo) => {
          convo.say("That's great! Visit https://dlg.im/en to get a plan.");
          convo.next();
        }
      },
      {
        pattern: /^continue_no$/,
        callback: (response, convo) => {
          convo.say('No problem');
          convo.next();
        }
      },
      {
        pattern: /^continue_unsure$/,
        callback: (response, convo) => {
          convo.say('Check out our features https://dlg.im/en/features');
          convo.next();
        }
      }
    ]);
  });
});

controller.hears('file', ['direct_mention', 'direct_message'], (bot, message) => {
  bot.reply(message, { file: {
    path: '/etc/services'
  }});
});

controller.hears('image', ['direct_mention', 'direct_message'], (bot, message) => {
  bot.reply(message, { file: {
    path: process.env.HOME + '/Downloads/242.png',
    image: true
  }});
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
