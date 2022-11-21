# twitter-image-downloader

A tool to download images posted on Twitter in bulk.

## Usage

### Authorize

Issue Consumer Key and Token at [developer.twitter.com](https://developer.twitter.com/).

Set to environment variable.

```.env
CONSUMER_KEY="xxxxxxxxxxxxxxxxxxxxxxxxx"
CONSUMER_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Then execute `deno task authorize` .

### Download

Set to environment variable.

```.env
CONSUMER_KEY="xxxxxxxxxxxxxxxxxxxxxxxxx"
CONSUMER_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
OAUTH_TOKEN="xxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
OAUTH_TOKEN_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Then execute `deno task download` .
