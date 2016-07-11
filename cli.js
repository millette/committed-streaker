#!/usr/bin/env node

'use strict'

// npm
const debug = require('debug')('yummy')

// self
const utils = require('./lib/utils')

/*
const dailyUpdates = () => utils.userDB.view('app', 'probs', (err, body) => {
  if (err) { return debug('dailyUpdates error: %s', err) }
  let data = shuffle(body.rows.filter((x) => Math.floor(1 + Math.random() * 1000) < 10 * x.key))

  data = data.slice(0, Math.floor(data.length / 20))
  const delay = Math.max(0.3, 30000 / data.length) // spread over 30s min.

  data.forEach((r, k) => {
    debug('setup contrib updates for %s', r.id)
    setTimeout((name) => {
      debug('contrib updates ready for %s', name)
      utils.refresh(name)
    }, k * delay, utils.couchUserToName(r))
  })

  setTimeout((name) => {
    utils.cdb.db.compact('u2', (err, body) => {
      if (err) { return debug('Compacting Error: %s', err) }
      debug('(%s) Compacting OK: %s', new Date().toISOString(), JSON.stringify(body))
    })
  }, 60000 + data.length * delay)

  debug('(%s) nItems: %s; delay: %s', new Date().toISOString(), data.length, delay)
})
*/

const dailyUpdates = () => utils.userDB.view('app', 'probs', (err, body) => {
  if (err) { return debug('dailyUpdates error: %s', err) }
  const data = body.rows.reverse()
  const delay = 500

  data.forEach((r, k) => {
    debug('setup contrib updates for %s', r.id)
    setTimeout((name) => {
      debug('contrib updates ready for %s', name)
      utils.refresh(name)
    }, k * delay, utils.couchUserToName(r))
  })

  setTimeout((name) => {
    utils.cdb.db.compact('u2', (err, body) => {
      if (err) { return debug('Compacting Error: %s', err) }
      debug('(%s) Compacting OK: %s', new Date().toISOString(), JSON.stringify(body))
    })
  }, 60000 + data.length * delay)

  debug('(%s) nItems: %s; delay: %s', new Date().toISOString(), data.length, delay)
})

dailyUpdates()
setInterval(dailyUpdates, utils.dayUnit)
