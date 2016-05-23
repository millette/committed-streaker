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
const router = require('express').Router()
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
  parts = parts.map((p) => process.env[p])
  parts.push(env)
  hash.update(parts.join(''), inputEncoding)
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

// should resave or saveUninitialized be true?
// Doesn't seem to make a difference in our case
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: new LevelStore(sessionDb)
}))

app.use(espCleanup)
app.use(passport.initialize())
app.use(passport.session())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', routes({ router: router }))
app.use('/login', login)
app.use('/profile', profile)
app.use('/logout', logout({ router: router }))

app.use((req, res, next) => {
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

if (app.get('env') === 'development') {
  app.use((err, req, res) => {
    res.status(err.status || 500)
    res.render('error', {
      message: err.message,
      error: err,
      title: 'error'
    })
  })
}

app.use((err, req, res) => {
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: {},
    title: 'error'
  })
})

module.exports = app
