Node.js api gateway to the Amazon Giftcard On Demand Web service
============

## Install
`npm install agcod`

## Configuration

Create a directory `config` in the root of your app. And add a `development.json`, `sandbox.json` and `production.json` in it that look like `config/example.json` in this repo.

## Usage
```javascript
const Client = require('agcod')
const client = new Client()

client.createGiftCard('NA', 123, 'USD', (error, result) => {
  console.log('client.createGiftCard response', error, result)
})
```

## Tests
During tests requests are intercepted by nock and responds with a desired response code and contents.
- https://davidwalsh.name/nock
- https://github.com/node-nock/nock

## Nota Bene
- This client needs to operate under TLS 1.2 or after June 30th, 2018 API requests will cease to work

## Other clients
For reference purposes, here's a list of resources that talk about agcod clients.
- https://github.com/larafale/agcod
- https://stackoverflow.com/questions/25007760/having-trouble-in-generating-amazon-aws-signature-with-php/25027843#25027843
- https://github.com/aws/aws-sdk-core-ruby/issues/113
- https://twitter.com/awsforphp/status/715337682096787457?lang=en
- https://forums.aws.amazon.com/thread.jspa?threadID=113404
