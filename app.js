'use strict'

if (!process.env.GITHUB_CLIENT_ID ||
  !process.env.GITHUB_CLIENT_SECRET ||
  !process.env.GITHUB_STREAKER_ROOT) {
  console.error('See readme about the required environment variables.')
  process.exit(255)
}

// core
const path = require('path')

const appRoot = path
  .join(process.env.GITHUB_STREAKER_ROOT, 'login/github/callback')
  // FIXME: should really use url.resolve
  // and suffix a / if missing
  .replace(':/', '://')

// npm
const express = require('express')
const passport = require('passport')
const Strategy = require('passport-github').Strategy
const favicon = require('serve-favicon')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const memoize = require('lodash.memoize')
const streakMem = memoize(require('rollodeqc-gh-user-streak'))
const sort = require('lodash.sortby')
const session = require('express-session')
const LevelStore = require('express-session-level')(session)
const db = require('level')('./myDb')

const routes = require('./routes/index')
const users = require('./routes/user')

passport.use(
  new Strategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: appRoot
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

const app = express()

const env = process.env.NODE_ENV || 'development'
// console.log('env:', env)
app.locals.ENV = env
app.locals.ENV_DEVELOPMENT = env === 'development'
// console.log('locals:', app.locals)
// console.log('get():', app.get('env'))

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(favicon(path.join(__dirname, 'public/img/favicon.ico')))
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())

app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true,
  store: new LevelStore(db)
}))

app.use(require('express-session-passport-cleanup'))
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

app.get('/logout', function (req, res){
  req.logout()
  res.redirect('/')
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
          output.push(`Longest streak in a year: ${response.streaks[0].commits.length} days (${response.streaks[0].commits.reduce((p, c) => p + c)} commits), started ${response.streaks[0].begin}.`)
          if (response.streaks[0].overlaps) {
            output.push('Note that the streak may be longer since it started at least 365 days ago.')
          }
          if (latest.begin !== response.streaks[0].begin) {
            output.push(`Latest streak: ${latest.commits.length} days (${latest.commits.reduce((p, c) => p + c)} commits), started ${latest.begin}.`)
          }
        } else {
          output.push('No commits in last 365 days.')
        }
        res.render('profile', { output: output.map((o) => `<p>${o}</p>`).join('\n'), data: response, user: req.user })
      })
  })

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handlers

// development error handler
// will print stacktrace

if (app.get('env') === 'development') {
  // console.log('GOT DEV')
  app.use(function (err, req, res, next) {
    // console.log('ERR1:', err)
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
  // console.log('ERR2:', err)
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: {},
    title: 'error'
  })
})

module.exports = app
