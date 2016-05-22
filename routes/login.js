'use strict'

// npm
const passport = require('passport')
const router = require('express').Router()

router.get('/', (req, res) => { res.render('login') })
router.get('/github', passport.authenticate('github'))
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/profile')
)

module.exports = router
