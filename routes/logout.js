'use strict'

// npm
const debug = require('debug')('app')

module.exports = (services) => {
  const router = services.router
  router.get('/', (req, res) => {
    debug('LOGOUT')
    req.logout()
    debug('REDIRECT')
    res.redirect('/')
  })
  debug('LOGOUT READY')
  return router
}
