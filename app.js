'use strict'

if (!process.env.GITHUB_CLIENT_ID ||
  !process.env.GITHUB_CLIENT_SECRET ||
  !process.env.GITHUB_STREAKER_ROOT) {
  console.error('See readme about the required environment variables.')
  process.exit(255)
}

// core
const path = require('path')
const crypto = require('crypto')

// npm
const express = require('express')
const favicon = require('serve-favicon')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const session = require('express-session')
const LevelStore = require('express-session-level')(session)
const level = require('level')
const espCleanup = require('express-session-passport-cleanup')

// app
const routes = require('./routes/index')
const login = require('./routes/login')
const profile = require('./routes/profile')
const logout = require('./routes/logout')

const env = process.env.NODE_ENV || 'development'
const sessionDb = level('./db/sessions-' + env)
const userDb = level('./db/users-' + env, { valueEncoding: 'json' })
const passport = require('./passport')(userDb)

const app = express()

app.locals.ENV = env
app.locals.ENV_DEVELOPMENT = env === 'development'

const sessionSecret = ((parts, hashType, inputEncoding, outputEncoding) => {
  const hash = crypto.createHash(hashType)
  const bla = parts.map((p) => process.env[p])
  bla.push(env)
  hash.update(bla.join(''), inputEncoding)
  return hash.digest(outputEncoding)
})(['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_STREAKER_ROOT'], 'sha256', 'utf8', 'base64')

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')
app.use(favicon(path.join(__dirname, 'public/img/favicon.ico')))
if (env === 'development') { app.use(logger('dev')) }
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())

app.use(session({
  secret: sessionSecret,
  resave: true,
  saveUninitialized: true,
  store: new LevelStore(sessionDb)
}))

app.use(espCleanup)
app.use(passport.initialize())
app.use(passport.session())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', routes)
app.use('/login', login)
app.use('/profile', profile)
app.use('/logout', logout)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
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
app.use((err, req, res, next) => {
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: {},
    title: 'error'
  })
})

module.exports = app
