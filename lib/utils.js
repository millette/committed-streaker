'use strict'

// core
const crypto = require('crypto')

exports.sessionSecret = (env) => {
  const hash = crypto.createHash('sha256')
  const parts = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_STREAKER_ROOT']
    .map((p) => process.env[p])
  parts.push(env)
  hash.update(parts.join(''), 'utf8')
  return hash.digest('base64')
}
