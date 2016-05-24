'use strict'

// npm
const debug = require('debug')('app')

module.exports = (services) => {
  services.router.get('/',
    services.ensureLogin.ensureLoggedIn(),
    (req, res) => {
      debug('PROFILE RENDER')
      res.render('profile', {
        output: req.user.app && req.user.app.output,
        data: req.user.app && req.user.app.response,
        user: req.user
      })
    }
  )

  services.router.get('/as-github',
    services.ensureLogin.ensureLoggedIn(),
    (req, res) => {
      debug('AS-GITHUB RENDER')
      res.render('as-github', {
        output: req.user.app && req.user.app.output,
        data: req.user.app && req.user.app.response,
        user: req.user
      })
    }
  )

  services.router.get('/streaks',
    services.ensureLogin.ensureLoggedIn(),
    (req, res) => {
      debug('STREAKS RENDER')
      res.render('streaks', {
        data: req.user.app && req.user.app.response,
        user: req.user
      })
    }
  )
  return services.router
}
