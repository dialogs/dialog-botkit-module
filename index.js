const Botkit = require('botkit/lib/CoreBot');
const DlgBot = require('@dlghq/dialog-bot-sdk/lib/Bot').default;
const {
  Peer,
} = require('@dlghq/dialog-bot-sdk');

function DialogsBot(config) {
  const dialog_botkit = Botkit(config || {});

  if (!config.token)
    throw new Error('Config option "token" is required.');

  if (!config.endpoints || config.endpoints.length == 0)
    throw new Error('Config option "endpoints" is required.');

  //
  //  Define bot sending logic
  //

  dialog_botkit.defineBot(function(botkit, config) {
    const bot = {
      type: 'dialogs',
      botkit: botkit,
      config: config || {},
      utterances: botkit.utterances,
    }

    bot.send = async (message, cb) => {
      console.log("MESSAGE TO SEND ", message);
      try {
        await bot.dlg.sendText(message.peer, message.text, message.attachment);
      } catch (err) {
        console.error('Error while sending message to Dialogs', err);
        if (cb) cb(err);
      }
      botkit.debug('Sent: ' + message.text);
      if (cb) cb(null, message.text);
    }

    bot.reply = (src, resp, cb) => {
      console.log(src);
      const msg = {
        raw_message: {
          peer: src.peer,
        }
      };

      if (typeof (resp) == 'string')
        msg.text = resp;
      else if (resp.text)
        msg.text = resp.text;
      else
        msg.text = "";

      bot.say(msg, cb);
    };

    bot.findConversation = function(message, cb) {
      botkit.debug('CUSTOM FIND CONVO', message.user, message.channel);
      for (var t = 0; t < botkit.tasks.length; t++) {
        for (var c = 0; c < botkit.tasks[t].convos.length; c++) {
          if (
              botkit.tasks[t].convos[c].isActive() &&
            botkit.tasks[t].convos[c].source_message.user == message.user &&
            botkit.tasks[t].convos[c].source_message.channel == message.channel &&
            botkit.excludedEvents.indexOf(message.type) == -1 // this type of message should not be included
          ) {
              botkit.debug('FOUND EXISTING CONVO!');
              cb(botkit.tasks[t].convos[c]);
              return;
          }
        }
      }
  
      cb();
    };

    return bot;
  });

  //
  //  Create new Dialog worker
  //
  dialog_botkit.middleware.spawn.use(async function(worker, next) {
    worker.dlg = new DlgBot({
      token: config.token,
      endpoints: config.endpoints
    });

    const stream = worker.dlg
      .onMessage(async msg => dialog_botkit.ingest(worker, msg))
      .subscribe({
        next() {},
        error(msg) { console.error('Error processing message: ', msg); }
      });
  
    console.log(`dialog: Connected to ${config.endpoints[0]}`);

    worker.self = await worker.dlg.getSelf();
    console.log(`dialog: Logged in as @${worker.self.nick} (#${worker.self.id})`);

    next();
  })

  //
  //  Transform Dialog message to Botkit
  //
  dialog_botkit.middleware.normalize.use(async function (bot, message, next) {
    message.channel = `${message.peer.id}:${message.peer.type}`;
    console.log(message);

    switch (message.content.type) {
      case 'text': {
        // Get history message object from message ID
        const historyMsgs = await bot.dlg.fetchMessages([message.id]);
        if (!historyMsgs || !historyMsgs[0]) {
          console.error(`dialog: Couldn't get full message content`);
          next();
          return;
        }

        const historyMsg = historyMsgs[0];

        // Get user from user ID
        const dlgUser = await bot.dlg.getUser(historyMsg.senderUserId);
        if (!dlgUser) {
          console.error(`dialog: Couldn't find sender of Dialogs message`);
          next();
          return;
        }

        message.user = dlgUser.id;
        message.text = message.content.text;
        message.type = 'message_received';
        break;
      }

      case 'service': {
        const ext = message.content.extension;
        if (ext.userInvited) {
          // Get user from user ID
          const dlgUser = await bot.dlg.getUser(historyMsg.senderUserId);
          if (!dlgUser) {
            console.error(`dialog: Couldn't find sender of Dialogs message`);
            next();
            return;
          }

          message.user = dlgUser.id;
          message.type = 'bot_room_join';
        } else if (ext.userKicked) {
          // Get user from user ID
          const dlgUser = await bot.dlg.getUser(historyMsg.senderUserId);
          if (!dlgUser) {
            console.error(`dialog: Couldn't find sender of Dialogs message`);
            next();
            return;
          }

          message.user = dlgUser.id;
          message.type = 'bot_room_leave';
        }
        break;
      }
    }

    next();
  });

  //
  //  Add additional info
  //
  dialog_botkit.middleware.categorize.use(function(bot, message, next) {
    switch (message.peer.type) {
      case 'private':
        message.type = 'direct_message';
        break;
      case 'group':
      default:
        // Check if message mentions bot
        if (message.text.indexOf(`@${bot.self.nick}`) != -1)
          message.type = 'mention';
        else
          message.type = 'ambient';
        break;
    }
    next();
  });

  //
  //  Transform Botkit message to Dialogs
  //
  dialog_botkit.middleware.format.use(function(bot, message, dlgMessage, next) {
    console.log(`dialog: Incoming message`);
    dlgMessage.text = message.text;
    if (message.raw_message) {
      dlgMessage.peer = message.raw_message.peer;
    } else {
      const peerElements = message.channel.split(":", 2);
      dlgMessage.peer = new Peer(peerElements[0], peerElements[1]);
    }
    next();
  });

  dialog_botkit.startTicking();

  return dialog_botkit;
}

module.exports = DialogsBot;
