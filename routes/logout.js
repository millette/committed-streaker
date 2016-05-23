'use strict'

// npm
const debug = require('debug')('app')

module.exports = (services) => {
  services.router.get('/', (req, res) => {
    debug('LOGOUT')
    req.logout()
    debug('REDIRECT')
    res.redirect('/')
  })
  debug('LOGOUT READY')
  return services.router
}
