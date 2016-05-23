'use strict'

if (!process.env.GITHUB_CLIENT_ID ||
  !process.env.GITHUB_CLIENT_SECRET ||
  !process.env.GITHUB_STREAKER_ROOT) {
  console.error('See readme about the required environment variables.')
  process.exit(255)
}

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
