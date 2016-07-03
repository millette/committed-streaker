#!/usr/bin/env node

'use strict'

// npm
const nano = require('nano')('http://localhost:5984')

const userDB = nano.use('_users')

const couchUser = (name) => `org.couchdb.user:${name}`

const data = require('/home/millette/full-qc.json').map((x) => x.login)

const newUser = (name) => new Promise((resolve, reject) => {
  const doc = {
    _id: couchUser(name),
    name: name,
    password: 'not-a-password',
    roles: [],
    type: 'user'
  }
  userDB.insert(doc, (err, body) => {
    if (err) { return reject(err) }
    resolve(body)
  })
})

let oks = 0

function looper () {
  const u = data.pop()
  if (!u) { return }
  newUser(u)
    .then((x) => console.log('OK', x, ++oks))
    .catch((err) => console.log('ERROR:', err))
  setTimeout(looper, 4000)
}

looper()
