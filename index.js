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
    };

    bot._send = async (message) => {
      if (message.text || message.actionOrActions) {
        await bot.dlg.sendText(message.peer, (message.text || ''), message.attachment, message.actionOrActions);
        console.log('dialog: Sent message: ' + message.text);
      }

      if (message.file) {
        if (message.file.image) {
          await bot.dlg.sendImage(message.peer, message.file.path, message.attachment);
          console.log('dialog: Sent image: ' + message.file.path);
        } else {
          await bot.dlg.sendDocument(message.peer, message.file.path, message.attachment);
          console.log('dialog: Sent file: ' + message.file.path);
        }
      }
    };

    bot.send = async (message, cb) => {
      console.log(message);
      try {
        await bot._send(message);
        if (cb) cb(null, message.text || "[non-text content]");
      } catch (err) {
        console.error('Error while sending message to Dialogs', err);
        if (cb) cb(err);
      }
    };

    bot.reply = (src, resp, cb) => {
      const msg = {
        raw_message: {
          peer: src.peer,
        }
      };

      if (typeof (resp) == 'string')
        msg.text = resp;
      else
        Object.assign(msg, resp);
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

    worker.dlg
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
    //console.log(message);
    message.text = "";
    message.channel = `${message.peer.id}:${message.peer.type}`;

    switch (message.content.type) {
      case 'text': {
        // Get history message object from message ID
        const historyMsgs = await bot.dlg.fetchMessages([message.id]);
        const historyMsg = historyMsgs[0];

        // Get user from user ID
        const dlgUser = await bot.dlg.getUser(historyMsg.senderUserId);
        message.user = dlgUser.id;
        message.text = message.content.text;
        message.type = 'message_received';
        break;
      }

      case 'service': {
        message.service = message.content.extension;
        break;
      }

      case 'document': {
        // Get history message object from message ID
        const historyMsgs = await bot.dlg.fetchMessages([message.id]);
        const historyMsg = historyMsgs[0];

        // Get user from user ID
        const dlgUser = await bot.dlg.getUser(historyMsg.senderUserId);
        message.user = dlgUser.id;
        message.document = message.content;
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
        switch (message.text.indexOf(`@${bot.self.nick}`)) {
          case -1: message.type = 'ambient'; break;
          case  0: message.type = 'direct_mention'; break;
          default: message.type = 'mention'; break;
        }
    }

    if (message.service) {
      const ext = message.service;
      if (ext.userInvited) {
        const uid = ext.userInvited.invitedUid;
        if (uid == bot.self.id) {
          message.type = 'bot_group_join';
          bot.botkit.debug(`Bot joined the group`);
        } else {
          message.type = 'user_group_join';
          bot.botkit.debug(`User #${uid} joined the group`);
          message.user = uid;
        }
      } else if (ext.userKicked) {
        const uid = ext.userKicked.kickedUid;
        if (uid == bot.self.id) {
          message.type = 'bot_group_leave';
          bot.botkit.debug(`Bot left the group`);
        } else {
          message.type = 'user_group_leave';
          bot.botkit.debug(`User #${uid} left the group`);
          message.user = uid;
        }
      }
    } else if (message.document) {
      message.type = 'file_share';
    }

    next();
  });

  //
  //  Transform Botkit message to Dialogs
  //
  dialog_botkit.middleware.format.use(function(bot, message, dlgMessage, next) {
    console.log(`dialog: Incoming message`);

    dlgMessage.text = message.text;
    dlgMessage.file = message.file;

    if (message.raw_message) {
      dlgMessage.peer = message.raw_message.peer;
    } else {
      const peerElements = message.channel.split(":", 2);
      dlgMessage.peer = new Peer(peerElements[0], peerElements[1]);
    }

    if (message.actions) {
      dlgMessage.raw_message.actionOrActions = message.actions;
    }

    next();
  });

  dialog_botkit.startTicking();

  return dialog_botkit;
}

module.exports = DialogsBot;
