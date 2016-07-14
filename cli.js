#!/usr/bin/env node

'use strict'

// npm
const sample = require('lodash.samplesize')
const debug = require('debug')('yummy')

// self
const utils = require('./lib/utils')

const userChanges = () => {
  const usersFeed = utils.userDB.follow({ include_docs: true, since: 'now' })
  usersFeed.on('change', (change) => {
    if (change.doc && change.doc.contribs) { return }
    if (change.delete) { return }
    if (change.id.indexOf('_design/') === 0) { return }
    debug('2) CHANGE %s %s', change.id, change.seq)
    utils.fetchContribs(change.doc.name)
      .then((contribs) => {
        change.doc.contribs = contribs
        utils.putUser(change.doc)
          .then((body) => debug('BODY %s %s', body.id, body.rev))
          .catch((err) => debug('insert user contribs error: %s', err))
      })
  })
  usersFeed.follow()
}

const dailyUpdates = (options) => utils.userDB.view(
  'app', 'probs', options || { descending: true },
  (err, body) => {
    if (err) { return debug('dailyUpdates error: %s', err) }
    const data = sample(body.rows, Math.floor(body.rows.length / 2))
    const delay = 600

    data.forEach((r, k) => {
      debug('setup contrib updates for %s', r.id)
      setTimeout((name) => {
        debug('updating contrib for %s', name)
        utils.refresh(name)
      }, k * delay, utils.couchUserToName(r))
    })

    setTimeout((name) => {
      utils.cdb.db.compact('u2', (err, body) => {
        if (err) { return debug('Compacting Error: %s', err) }
        debug('(%s) Compacting OK: %s', new Date().toISOString(), JSON.stringify(body))
      })
    }, (10 + data.length) * delay)

    debug('(%s) nItems: %s; delay: %s', new Date().toISOString(), data.length, delay)
  }
)

const dailySome = dailyUpdates.bind(null, { descending: true, endkey: 6 }) // 5000
const dailyWorked = dailyUpdates.bind(null, { descending: true, endkey: 75 }) // 200-400
const dailyZero = dailyUpdates.bind(null, { endkey: 75 }) // 4000

userChanges()
dailySome()
setTimeout(() => setInterval(dailySome, utils.dayUnit / 7), utils.dayUnit / 7)
setInterval(dailyWorked, utils.dayUnit / 20)
setInterval(dailyZero, utils.dayUnit)
