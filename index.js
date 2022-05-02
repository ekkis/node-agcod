const BigNumber = require('bignumber.js')
const request = require('request')
const aws4 = require('aws4')
const config = require('config')
const helpers = require('./lib/helpers')
module.exports = class {
  constructor(cfg = {}) {
    var env = process.env.NODE_ENV || 'sandbox'
    var fn = './.agcod/' + env + '.json'
    if (typeof cfg == 'string') { fn = cfg; cfg = {} }
    if (Object.keys(cfg).length == 0) {
      cfg = require(fn)
    }
    this.config = Object.assign(config, cfg)
    if (!this.config.partnerId)
      throw new Error('No partner ID supplied')
    var creds = this.config.credentials
    if (!creds.accessKeyId || !creds.secretAccessKey)
      throw new Error('Invalid credentials supplied!')
  }

  createGiftCard(country, amount, currencyCode, cb) {
    var region = this._getRegion(country)
    if (amount < 0)
      throw new Error('Amounts supplied must be positive!')
    if (typeof currencyCode === 'function') {
      cb = currencyCode
      currencyCode = this.config.currency[country]
      if (!currencyCode)
        throw new Error('No currency available for county selected!')
    }
    const sequentialId = this._getNewId()
    const requestBody = this._getCreateGiftCardRequestBody(sequentialId, amount, currencyCode)
    const signedRequest = this._getSignedRequest(region, 'CreateGiftCard', requestBody)
    const req = this._doRequest(signedRequest, cb)

    return { req, sequentialId, requestBody, signedRequest }
  }

  createGiftCardAgain(region, amount, currencyCode, sequentialId, cb) {
    this._checkRegion(region)
    const requestBody = this._getCreateGiftCardRequestBody(sequentialId, amount, currencyCode)
    const signedRequest = this._getSignedRequest(region, 'CreateGiftCard', requestBody)
    const req = this._doRequest(signedRequest, cb)

    return { req, sequentialId, requestBody, signedRequest }
  }

  cancelGiftCard(region, sequentialId, gcId, cb) {
    this._checkRegion(region)
    const requestBody = this._getCancelGiftCardRequestBody(sequentialId, gcId)
    const signedRequest = this._getSignedRequest(region, 'CancelGiftCard', requestBody)
    const req = this._doRequest(signedRequest, cb)

    return { req, requestBody, signedRequest }
  }

  /**
   * Throws when region is not NA, EU or FE
   */
  _checkRegion(region) {
    var regions = Object.keys(this.config.endpoint)
    if (regions.indexOf(region) === -1) {
      throw new Error('Region must be one of: ' + regions.join(', '))
    }
  }

  _getRegion(country) {
    var e = this.config.endpoint
    for (var k of Object.keys(e)) {
      if (e[k].countries.indexOf(country) > -1)
        return k
    }
    throw new Error(`No valid country code provided!`)
  }

  /**
   * Builds the request body to be POSTed for creating a gift card
   * @returns {Object}
   */
  _getCreateGiftCardRequestBody(sequentialId, amount, currencyCode) {
    return helpers.CreateGiftCardRequest(
      this.config.partnerId,
      sequentialId, amount, currencyCode
    )
  }

  /**
   * Builds the request body to be POSTed for cancelling a gift card
   * @returns {Object}
   */
  _getCancelGiftCardRequestBody(sequentialId, gcId) {
    return helpers.CancelGiftCardRequest(
      this.config.partnerId,
      sequentialId, gcId
    )
  }

  /**
   * Builds an object with all the specifics for a new https request
   * it includes headers with a version 4 signing authentication header
   * @param {string} region - 'NA' for US/CA, 'EU' for IT/ES/DE/FR/UK, 'FE' for JP
   * @param {string} action - 'CreateGiftCard' or 'CancelGiftCard'
   * @param {Object} requestBody - generated by _getCreateGiftCardRequestBody or _getCancelGiftCardRequestBody
   * @returns {Object}
   */
  _getSignedRequest(region, action, requestBody) {
    const credentials = this.config.credentials;
    const endpoint = this.config.endpoint[region]
    const opts = {
      region: endpoint.region,
      host: endpoint.host,
      path: `/${action}`,
      body: JSON.stringify(requestBody),
      // defaults
      service: 'AGCODService',
      headers: Object.assign({
        'accept': `application/json`,
        'content-type': `application/json`,
        'x-amz-target': `com.amazonaws.agcod.AGCODService.${action}`
      }, this.config.extraHeaders),
      method: 'POST',
      securityOptions: 'SSL_OP_NO_SSLv3'
    }

    return aws4.sign(opts, credentials)
  }

  /**
   * Makes the https based on the object created _getSignedRequest
   * @param {Object} signedRequest - signed re'NA' for US/CA, 'EU' for IT/ES/DE/FR/UK, 'FE' for JP
   * @param {Function} cb - Callback function
   * @returns {Object} - whatever node-request returns
   */
  _doRequest(signedRequest, cb) {
    const params = {
      method: 'POST',
      url: `https://${signedRequest.host}${signedRequest.path}`,
      headers: signedRequest.headers,
      body: signedRequest.body
    }

    return request(params, (error, response, result) => {
      if (error) return cb(error)

      if (response.statusCode !== 200) {
        const err = Object.assign({
          request: params,
          statusCode: response.statusCode
        }, JSON.parse(result))

        return cb(err)
      }

      return cb(null, JSON.parse(result))
    })
  }

  /**
   * Generates a unique sequential base-36 string based on processor time
   * @returns string with length of 10
   */
  _getNewId() {
    let hrTime = process.hrtime()
    let id = new BigNumber(hrTime[0]).times('1e9').plus(hrTime[1]).toString(36)
    return id
  }
}
