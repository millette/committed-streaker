'use strict'

// npm
const streak = require('rollodeqc-gh-user-streak')
const shuffle = require('lodash.shuffle')
const debug = require('debug')('yummy')

exports.userDB = require('nano')('http://localhost:5984/u2')

exports.dayUnit = 86400000

exports.couchUserToName = (resp) => resp.id.slice(17) // 'org.couchdb.user:'.length === 17

exports.fetchContribs = (name) => streak.fetchContribs(name)
  .then((contribs) => {
    const contribs2 = { }
    contribs.forEach((c) => { contribs2[c.date] = c.count })
    return contribs2
  })

exports.couchUser = (name) => `org.couchdb.user:${name}`

exports.getUser = (name) => new Promise((resolve, reject) => {
  exports.userDB.get(exports.couchUser(name), (err, change) => {
    if (err) { return reject(err) }
    resolve(change)
  })
})

exports.putUser = (userDoc) => new Promise((resolve, reject) => {
  const now = new Date().toISOString().split('.')[0] + 'Z'
  if (!userDoc.created_at) { userDoc.created_at = now }
  userDoc.updated_at = now
  if (!userDoc._id) { userDoc._id = exports.couchUser(userDoc.name) }
  exports.userDB.insert(userDoc, (err, change) => {
    if (err) { return reject(err) }
    resolve(change)
  })
})

exports.refresh = (name) => Promise.all([exports.getUser(name), exports.fetchContribs(name)])
  .then((ps) => {
    if (!ps[0].contribs) { ps[0].contribs = { } }
    Object.assign(ps[0].contribs, ps[1]) // ps[1].filter((z) => z.count)
    return exports.putUser(ps[0])
  })

exports.dailyUpdates = () => exports.userDB.view('app', 'probs', (err, body) => {
  if (err) { return debug('dailyUpdates error: %s', err) }
  const data = body.rows
    .filter((x) => Math.floor(1 + Math.random() * 1000) < 10 * x.key)
  const delay = 3600000 / data.length // spread over 1h
  debug('nItems: %s; delay: %s', data.length, delay)

  data.forEach((r, k) => {
    debug('setup contrib updates for %s', r.id)
    setTimeout((name) => {
      debug('contrib updates ready for %s', name)
      exports.refresh(name)
    }, k * delay, exports.couchUserToName(r))
  })
})
