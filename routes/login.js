'use strict'

// npm
const debug = require('debug')('app')

module.exports = (services) => {
  services.router.get('/', (req, res) => {
    debug('LOGIN')
    res.render('login')
  })
  services.router.get('/github', services.passport.authenticate('github'))
  services.router.get('/github/callback',
    services.passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
      debug('LOGIN REDIRECT')
      res.redirect('/profile/as-github')
    }
  )
  return services.router
}
