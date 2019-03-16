#!/usr/bin/env node

const dlg = require('./index.js');
const {
  Action,
  ActionGroup,
  ActionStyle,
  Button
} = require('@dlghq/dialog-bot-sdk');

if (!process.env.DIALOGS_TOKEN)
  throw "$DIALOGS_TOKEN not set";
if (!process.env.DIALOGS_ENDPOINT)
  throw "$DIALOGS_ENDPOINT not set";

const controller = dlg({
  debug: true,
  token: process.env.DIALOGS_TOKEN,
  endpoints: [process.env.DIALOGS_ENDPOINT]
});

const bot = controller.spawn({});

controller.hears('help', ['direct_mention', 'direct_message'], (bot, message) => {
  bot.reply(message,
    "Mention/DM commands:\n" +
    " - convo: Conversation\n" +
    " - actions: Interactive conversation\n" +
    " - file: Send a file\n" +
    " - image: Send an image\n" +
    " - help: Print this help\n" +
    "Recognized meta events:\n" +
    " - bot_group_join: This bot joined a group\n" +
    " - user_group_join: User joined a group\n" +
    " - user_group_leave: User left a group\n" +
    "Recognized message events\n" +
    " - file_share: Received file or media\n" +
    " - direct_message: Message in DMs\n" +
    " - ambient: Message in group, bot not mentioned\n" +
    " - mention: Message in group, bot mentioned\n" +
    " - direct_mention: Message in group, bot mention at beginning of message\n");
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

controller.on('direct_message', (bot, message) => {
  bot.reply(message, 'You sent me a direct message');
});

controller.on('ambient', (bot, message) => {
  const sentence = 'I saw a message in this group';
  if (message.text != sentence)
    bot.reply(message, sentence);
});

controller.on('mention', (bot, message) => {
  bot.reply(message, 'Someone mentioned me in this group');
});

controller.on('direct_mention', (bot, message) => {
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

controller.hears('convo', ['direct_mention', 'direct_message'], (bot, message) => {
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
    text: 'Switch?',
    actions: ActionGroup.create({
      title: 'Continue?',
      description: 'Switch to Dialogs, the handy and feature-rich enterprise multi-device messenger?',
      actions: [
        Action.create({
          id: 'continue_yes',
          style: ActionStyle.PRIMARY,
          widget: Button.create({ label: 'Yes!' })
        }),
        Action.create({
          id: 'continue_no',
          style: ActionStyle.DANGER,
          widget: Button.create({ label: 'No :(' })
        }),
        Action.create({
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

/*controller.hears('update', ['direct_mention', 'direct_message'], (bot, message) => {
  let i = 0;
  const query = {
    text: 'Update',
    actions: ActionGroup.create({
      actions: [
        Action.create({
          id: 'add_' + (Math.random() * 999),
          widget: Button.create({ label: 'Clicks: ' + i })
        })
      ]
    })
  };
  bot.reply(message, query, () => {
    controller.on('action_event', (bot, message) => {
      i++;
      query.actions.actions[0].widget.label = 'Clicks: ' + i;
      query.id = mid;
      bot.update(query, query);
    });
  });
});*/
