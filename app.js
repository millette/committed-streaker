'use strict'

var express = require('express')
var passport = require('passport')
var Strategy = require('passport-github').Strategy

var path = require('path')
var favicon = require('serve-favicon')
var logger = require('morgan')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')

const streak = require('rollodeqc-gh-user-streak')
const sort = require('lodash.sortby')
const memoize = require('lodash.memoize')

const streakMem = memoize(streak)

var routes = require('./routes/index')
var users = require('./routes/user')

passport.use(
  new Strategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: 'http://localhost:3030/login/github/callback' // was github/return in example
  },
  function (accessToken, refreshToken, profile, cb) {
    // In this example, the user's Facebook profile is supplied as the user
    // record.  In a production-quality application, the Facebook profile should
    // be associated with a user record in the application's database, which
    // allows for account linking and authentication with other identity
    // providers.

    // User.findOrCreate({ githubId: profile.id }, function (err, user) {
      // return cb(err, user)
    // })
    return cb(null, profile)
  }
))

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Twitter profile is serialized
// and deserialized.
passport.serializeUser(function (user, cb) {
  cb(null, user)
})

passport.deserializeUser(function (obj, cb) {
  cb(null, obj)
})

var app = express()

var env = process.env.NODE_ENV || 'development'
app.locals.ENV = env
app.locals.ENV_DEVELOPMENT = env === 'development'

// view engine setup

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(favicon(path.join(__dirname, 'public/img/favicon.ico')))
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(cookieParser())

app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }))

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize())
app.use(passport.session())

app.use(express.static(path.join(__dirname, 'public')))

app.use('/i2', routes)
app.use('/u2', users)

// Define routes.
app.get('/',
  function (req, res) {
    res.render('home', { user: req.user })
  })

app.get('/login',
  function (req, res) {
    res.render('login')
  })

app.get('/login/github',
  passport.authenticate('github'))

app.get('/login/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function (req, res) {
    res.redirect('/')
  })

app.get('/profile',
  require('connect-ensure-login').ensureLoggedIn(),
  function (req, res) {
    streakMem(req.user.username)
      .then((response) => {
        const output = []
        if (response.streaks.length) {
          const latest = sort(response.streaks, 'begin').reverse()[0]
          // console.log(chalk.green(`Longest streak in a year: ${response.streaks[0].commits.length} days (${response.streaks[0].commits.reduce((p, c) => p + c)} commits), started ${response.streaks[0].begin}.`))
          output.push(`Longest streak in a year: ${response.streaks[0].commits.length} days (${response.streaks[0].commits.reduce((p, c) => p + c)} commits), started ${response.streaks[0].begin}.`)
          if (response.streaks[0].overlaps) {
            // console.log(chalk.red.bold('Note that the streak may be longer since it started at least 365 days ago.'))
            output.push('Note that the streak may be longer since it started at least 365 days ago.')
          }
          if (latest.begin !== response.streaks[0].begin) {
            // console.log(`Latest streak: ${latest.commits.length} days (${latest.commits.reduce((p, c) => p + c)} commits), started ${latest.begin}.`)
            output.push(`Latest streak: ${latest.commits.length} days (${latest.commits.reduce((p, c) => p + c)} commits), started ${latest.begin}.`)
          }
        } else {
          // console.log('No commits in last 365 days.')
          output.push('No commits in last 365 days.')
        }
        res.render('profile', { output: output.map((o) => `<p>${o}</p>`).join('\n'), data: response, user: req.user })
      })
  })

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handlers

// development error handler
// will print stacktrace

if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    res.render('error', {
      message: err.message,
      error: err,
      title: 'error'
    })
  })
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: {},
    title: 'error'
  })
})

module.exports = app
