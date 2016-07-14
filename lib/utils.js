'use strict'

// npm
const streak = require('rollodeqc-gh-user-streak')
// const shuffle = require('lodash.shuffle')
const debug = require('debug')('yummy')
const nano = require('nano')

exports.cdb = nano('http://localhost:5984/')

exports.userDB = exports.cdb.use('u2')

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

const lastDay = (c) => Object.keys(c).sort().reverse()[0]

const contribsChanged = (co, cn) => {
  const ldco = lastDay(co)
  const ldcn = lastDay(cn)
  if (ldco !== ldcn) { return true }
  return co[ldcn] !== cn[ldcn]
}

exports.refresh = (name) => exports.getUser(name)
  .then((u) => Date.now() - (Date.parse(u.updated_at) || 0) < 3600000
    ? Promise.reject(new Error(`Must wait 1h between contrib updates for ${name}.`))
    : Promise.all([u, exports.fetchContribs(name)])
  )
  .then((ps) => {
    if (ps[0].contribs) {
      if (contribsChanged(ps[0].contribs, ps[1])) {
        Object.assign(ps[0].contribs, ps[1])
      } else {
        return Promise.reject(`No change in contribs, won't be saving the user ${name}`)
      }
    } else {
      ps[0].contribs = ps[1]
    }
    return ps[0]
  })
  .then((u) => exports.putUser(u))
  .then((c) => {
    debug('Updated %s: %s', name, c.rev)
    return c
  })
  .catch((e) => {
    debug('Refresh: %s', e)
  })
