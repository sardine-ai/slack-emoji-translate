require('dotenv').config();

const langcode = require('./langcode');

const { App, ExpressReceiver } = require('@slack/bolt');
const { Translate } = require('@google-cloud/translate').v2;

// Create a custom receiver
const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true
});

// Initialize the app with the receiver
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver
});

console.log(`initializing translate with project id ${process.env.GOOGLE_PROJECT_ID}`);
const translate = new Translate({
  projectId: process.env.GOOGLE_PROJECT_ID,
});

app.event('reaction_added', async ({ event, client }) => {
  const { type, reaction, item } = event;

  if (type === 'reaction_added') {
    // If this bot was triggered && it is a correct emoji, translate the message into a specified language

    if (item.type !== 'message') {
      return;
    }

    let country = '';

    // Check emoji if it is a country flag
    if (reaction.match(/flag-/)) { // when an emoji has flag- prefix
      country = reaction.match(/(?!flag-\b)\b\w+/)[0];
    } else { // jp, fr, etc.
      const flags = Object.keys(langcode); // array
      if (flags.includes(reaction)) {
        country = reaction;
      } else {
        return;
      }
    }

    // Finding a lang based on a country is not the best way but oh well
    // Matching ISO 639-1 language code
    let lang = langcode[country];
    if (!lang) return;

    let messages = await getMessage(item.channel, item.ts, client);
    postTranslatedMessage(messages, lang, item.channel, reaction, client);

  }
});

const getMessage = async (channel, ts, client) => {
  try {
    const result = await client.conversations.replies({
      channel: channel,
      ts: ts,
      limit: 1,
      inclusive: true
    });
    return result.messages;
  } catch (e) {
    console.log(e);
  }
};

const postTranslatedMessage = (messages, lang, channel, emoji, client) => {

  // Google Translate API

  let message = messages[0];
  translate.translate(message.text, lang, (err, translation) => {
    if (err) {
      console.log(err);
    } else {
      if (isAlreadyPosted(messages, translation)) return;
      postMessage(message, translation, lang, channel, emoji, client);
    }
  });
};

const isAlreadyPosted = (messages, translation) => {
  // To avoid posting same messages several times, check the thread for an identical translation
  let alreadyPosted = false;
  messages.forEach(messageInTheThread => {
    if (!alreadyPosted && messageInTheThread.subtype && messageInTheThread.blocks[0].text.text === translation) {
      alreadyPosted = true;
    }
  });
  if (alreadyPosted) {
    return true;
  }
};

const postMessage = async (message, translation, lang, channel, emoji, client) => {

  const ts = (message.thread_ts) ? message.thread_ts : message.ts;

  let text = '';
  let blocks = [];

  if (message.text) { // Check if the message has translated
    text = `_Here is a translation to_ :${emoji}: _(${lang})_`;
    blocks.push(
      {
        type: "section", 
        text: {
          type: "mrkdwn", 
          text: `${translation}` 
        }
      },
      {
        type: "context", 
        elements: [
          { type: "mrkdwn", text: `A translation of the original message to :${emoji}: _(${lang})_` }
        ] 
      },
    );
  } else {
    text = '_Sorry, the language is not supported!_ :persevere:';
    blocks.push(
      {
        type: "section", 
        text: {
          type: "mrkdwn", 
          text: `_Sorry, the language is not supported!_ :persevere:` 
        }
      }
    );
  }

  try {
    const result = await client.chat.postMessage({
      text,
      blocks,
      channel,
      thread_ts: ts
    });

    console.log(result);
  } catch (e) {
    console.log(e);
  }
};

// For local development
if (process.env.NODE_ENV !== 'production') {
  (async () => {
    try {
      // Start your app on a specific port
      await app.start(process.env.PORT || 3000);
      console.log(`⚡️ Bolt app is running with port ${process.env.PORT || 3000}!`);
    } catch (error) {
      console.error('Unable to start App', error);
      process.exit(1);
    }
  })();
}

// For Google Cloud Functions
exports.slackEmojiTranslator = async (req, res) => {
  try {
    // Handle URL verification challenge
    if (req.body.type === 'url_verification') {
      return res.status(200).send({
        challenge: req.body.challenge
      });
    }
    
    // Use the expressReceiver to handle the request
    await expressReceiver.requestHandler(req, res);
  } catch (error) {
    console.error('Error processing event:', error);
    console.error('Request body:', JSON.stringify(req.body));
    res.status(500).send('Error processing event');
  }
};