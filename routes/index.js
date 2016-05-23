'use strict'

// npm
const debug = require('debug')('app')

module.exports = (services) => {
  const router = services.router
  router.get('/', (req, res) => {
    debug('HOME RENDER')
    res.render('home', { user: req.user })
  })
  debug('HOME READY')
  return router
}
