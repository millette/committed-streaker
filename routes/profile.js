'use strict'

// npm
const debug = require('debug')('app')
const ensureLogin = require('connect-ensure-login')
const router = require('express').Router()

router.get('/',
  ensureLogin.ensureLoggedIn(),
  (req, res) => {
    debug('PROFILE RENDER')
    res.render('profile', {
      output: req.user.app && req.user.app.output,
      data: req.user.app && req.user.app.response,
      user: req.user
    })
  }
)

router.get('/streaks',
  ensureLogin.ensureLoggedIn(),
  (req, res) => {
    debug('STREAKS RENDER')
    res.render('streaks', {
      data: req.user.app && req.user.app.response,
      user: req.user
    })
  }
)

module.exports = router
