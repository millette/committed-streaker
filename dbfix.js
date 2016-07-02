'use strict'

// npm
const nano = require('nano')('http://localhost:5984')

const userDB = nano.use('_users')

const fix = (doc) => new Promise((resolve, reject) => {
  const contribs = { }
  doc.contribs.forEach((c) => { contribs[c.date] = c.count })
  doc.contribs = contribs
  userDB.insert(doc, (err, body) => {
    if (err) { return reject(err) }
    resolve(body)
  })
})

// userDB.list({ startkey: 'org.couchdb.user:' }, (err, body) => {
userDB.list({ startkey: 'org.couchdb.user:', include_docs: true }, (err, body) => {
  if (err) {
    console.log('ERR:', err)
    return
  }

  // console.log('body:', body)
  Promise.all(body.rows.map((r) => fix(r.doc)))
    .then((p) => {
      console.log(p.length, p)
    })
})
