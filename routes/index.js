'use strict'

// npm
const debug = require('debug')('app')

module.exports = (services) => {
  services.router.get('/', (req, res) => {
    debug('HOME RENDER')
    res.render('home', { user: req.user })
  })
  return services.router
}
