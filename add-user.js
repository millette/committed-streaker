#!/usr/bin/env node

'use strict'

// npm
const nano = require('nano')('http://localhost:5984')

const userDB = nano.use('_users')

const couchUser = (name) => `org.couchdb.user:${name}`

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

if (!process.argv[2]) {
  console.log('need github username arg.')
  return
}

newUser(process.argv[2])
  .then((x) => console.log('OK', x))
  .catch((err) => console.log('ERROR:', err))
