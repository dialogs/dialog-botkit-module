# Botkit and Dialogs

TODO Table of Contents

## Getting Started

TODO

#### dlg()
| Argument | Description
|--- |---
| config | an object containing configuration options

Returns a new Botkit SlackBot controller.

The `config` argument is an object with these properties:

| Name | Type | Description
|--- |--- |---
| debug | Boolean | Enable debug logging
| token | string | dialog bot token
| endpoints | array | list of dialog grpc endpoints

For example:

```javascript
var dlg = require('@dlghq/botkit-module');

var controller = dlg({
    token: process.env.DIALOGS_TOKEN,
    endpoints: [process.env.DIALOGS_ENDPOINT],
    scopes: ['bot'],
});
```

## Event List

In addition to the [core events that Botkit fires](core.md#receiving-messages-and-events), this connector also fires some platform specific events.

In fact, Botkit will receive, normalize and emit any event that it receives from Dialog.

### Incoming Message Events
| Event | Description
|--- |---
| direct_message | the bot received a direct message from a user
| direct_mention | the bot was addressed directly in a channel
| mention | the bot was mentioned by someone in a message
| ambient | the message received had no mention of the bot
| action_event | the user has responded to an action group

### User Activity Events:
| Event | Description
|--- |---
| bot_group_join | the bot has joined a group
| user_group_join | a user has joined a group
| bot_group_left | the bot has left a group
| user_group_left | a user has left a group


## Files

### Receiving

Files sent by other users trigger the `file_share` event.
`message.raw_message.document` contains the file information.

### Sending

#### Regular files

Send a message object with a file property:
```js
bot.reply(message, {
    file: {
        path: '/path/to/file'
    }
})
```

#### Images

Same as regular files, but set `image`:

```js
bot.reply(message, {
    file: {
        path: '/path/to/file.jpg',
        image: true
    }
})
```

## Interactive Content

TODO More detailed explanation

### Sending ActionGroups

Send a message with an `actions` object.
`actions` is one or multiple [ActionGroups](https://dialogs.github.io/js-bot-sdk/classes/actiongroup.html).

Each `ActionGroup` contains multiple [Actions](https://dialogs.github.io/js-bot-sdk/classes/action.html)
that can be either Buttons or Selects at the time of writing.
An Action has a unique `id` that will be used to match user responses.

```js
bot.reply(message, {
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
});
```

### Receiving responses

When a user clicks an Action sent by the bot,
the bot receives an `action_event` type message.
The content of the message is the action `id`.

The easiest way to handle interactive action clicks are [Botkit conversations](https://botkit.ai/docs/core.html#multi-message-conversations).
Let's take the action group above and re-use it in conversation logic:

```js
// Action message from above
const response = { actions: ActionGroup.create({ /*...*/ }) };

bot.startConversation(message, function(err, convo) {
    convo.ask(response, [
        {
            pattern: /^continue_yes$/, // Match the full message ID
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
        }
    ]);
});
```

Of course, you can have nested `convo.ask` calls for arbitrarily complex conversation chains.

### Updating user content

TODO

## Testing Bot

This repo contains a test Botkit bot that demonstrates the features of the Dialogs platform.

#### Installation

```shell
git clone https://github.com/dialogs/dialog-botkit-module
cd dialog-botkit-module
npm install
export DIALOGS_TOKEN=xxx
./test.js
The testing bot will demonstrate all the features implemented in this PR.
Sent @<username> help to start.
```

#### Usage

Mention the bot like this: `@bot help` to get started with the features.
