# emoji-translator for Slack

This slackbot translates a message when a user reacts with an emoji. For example, when a message gets a `:flag-de:` reacji, this bot translates the original message to German and posts it in the message thread.

This is baed on https://github.com/slackapi/reacjilator, modified to run on GCP cloud function.

![Reacjilator demo](tutorial_images/reacjilator-demo.gif)

## Set Up Your Slack App (one time setup)

1. Create an app at your Slack App Settings page at [api.slack.com/apps](https://api.slack.com/apps)
2. Choose "From an app manifest", select the workspace you want to use, then paste the contents of [`manifest.yml`](./manifest.yml) into the dialog marked "Enter app manifest below".
3. On the **OAuth & Permissions** page, install the app and get a **Bot User OAuth Token** - it begins with `xoxb-`.
4. On the **Basic Information** page, find your **Signing Secret** and copy it to your `.env` file as `SLACK_SIGNING_SECRET`.
5. Under **Event Subscriptions**, enable events and set the Request URL to your deployed app URL (e.g., your Google Cloud Function URL).
6. Subscribe to the `reaction_added` bot event.

Get your bot token at **OAuth & Permissions** and your Signing Secret at **Basic Information**.

### Credentials

Rename the `.env.sample` to `.env` and fill the env vars with your credentials. You also need Google credentials to use the Google translation API:

```
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
GOOGLE_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=
PORT=3000
```

## Deployment

### Local Development

To run the app locally:

```
npm start
```

You'll need to expose your local server to the internet using a tool like [ngrok](https://ngrok.com/) to receive events from Slack.

### Google Cloud Functions

To deploy to Google Cloud Functions:

```
npm run deploy
```

After deployment, set the function URL as your Request URL in the Slack app's Event Subscriptions page.

