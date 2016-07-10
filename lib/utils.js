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

exports.dailyUpdates = (onStart) => {
  if (onStart === 'dont') { return }
  exports.userDB.list({ startkey: 'org.couchdb.user:', endkey: 'org.couchdb.user:\ufff0' }, (err, body) => {
    if (err) { return debug('dailyUpdates error: %s', err) }
    // const delay = 21600000 / body.rows.length // spread over 6h
    // const delay = 5400000 / body.rows.length // spread over 90m
    // const delay = 12600000 / body.rows.length // spread over 3.5h
    // const delay = 1800000 / body.rows.length // spread over 30m
    // const delay = 19440000 / body.rows.length // spread over 5.4h
    // const delay = 61200000 / body.rows.length // spread over 17h
    const delay = 2 * exports.dayUnit / body.rows.length // spread over 1d

    shuffle(body.rows).forEach((r, k) => {
      debug('setup contrib updates for %s', r.id)
      setTimeout((name) => {
        debug('contrib updates ready for %s', name)
        if (onStart) { exports.refresh(name) }
        setInterval(exports.refresh.bind(null, name), exports.dayUnit)
      }, k * delay, exports.couchUserToName(r))
    })
  })
}
