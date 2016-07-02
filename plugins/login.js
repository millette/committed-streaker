'use strict'

// npm
const joi = require('joi')
const streak = require('rollodeqc-gh-user-streak')
const debug = require('debug')('yummy')
const pick = require('lodash.pick')
const shuffle = require('lodash.shuffle')
const nano = require('nano')('http://localhost:5984')

debug('loaded...')

const userDB = nano.use('_users')

const fetchContribs = (name) => streak.fetchContribs(name)
  .then((contribs) => {
    const contribs2 = { }
    contribs.forEach((c) => { contribs2[c.date] = c.count })
    return contribs2
  })

const couchUser = (name) => `org.couchdb.user:${name}`

const getUser = (name) => new Promise((resolve, reject) => {
  userDB.get(couchUser(name), (err, change) => {
    if (err) { return reject(err) }
    resolve(change)
  })
})

const putUser = (userDoc) => new Promise((resolve, reject) => {
  userDB.insert(userDoc, (err, change) => {
    if (err) { return reject(err) }
    resolve(change)
  })
})

const refreshImp = (name) => Promise.all([
  getUser(name), fetchContribs(name)
])
  .then((ps) => {
    Object.assign(ps[0].contribs, ps[1])
    return putUser(ps[0])
  })

const dailyUpdates = () => {
  userDB.list({ startkey: 'org.couchdb.user:' }, (err, body) => {
    if (err) { return debug('dailyUpdates error:', err) }
    const delay = 21600000 / body.rows.length
    // const delay = 1800000 / body.rows.length
    // const delay = 86400000 / body.rows.length
    const rows = shuffle(body.rows)
    rows.forEach((r, k) => {
      debug('r, k:', r, k)
      setTimeout((name) => {
        debug('name, k:', name, k)
        setInterval(refreshImp.bind(null, name), 86400000)
      }, k * delay, r.id.slice(17))
    })
  })
}

const refresh = (request, reply) => refreshImp(request.params.name)
  .then(() => reply.redirect(`/user/${request.params.name}`))
  .catch((err) => {
    debug('refresh error:', err)
    reply.redirect(`/user/${request.params.name}`)
  })

const login = (request, reply) => request.auth.session.authenticate(
  request.payload.name,
  request.payload.password,
  () => reply.redirect(`/user/${request.payload.name}`)
)

const registerUser = (request, reply) => {
  if (request.payload.password && request.payload.password === request.payload.password2) {
    return putUser({
      _id: couchUser(request.payload.name),
      name: request.payload.name,
      password: request.payload.password,
      roles: [],
      type: 'user'
    })
      .then((r) => setInterval(refreshImp.bind(null, r._id.slice(17)), 86400000))
      .then(() => login(request, reply))
      .catch((e) => reply.redirect('/register'))
  } else {
    reply.redirect('/register')
  }
}

const logout = (request, reply) => {
  request.auth.session.clear()
  return reply.redirect('/')
}

const serverLoad = (request, reply) => reply.view('home', { load: request.server.load })

const user = (request, reply) => getUser(request.params.name)
  .then((body) => {
    const doc = pick(body, ['name', 'contribs', '_rev'])
    reply.view('user', { user: doc }).etag(body._rev)
  })
  .catch((err) => {
    debug('get user error:', err)
    reply.redirect('/')
  })

const after = (server, next) => {
  debug('after...')
  server.auth.strategy('default', 'couchdb-cookie', true, {
    redirectTo: '/login',
    redirectOnTry: false
  })

  server.route({
    method: 'GET',
    path: '/register',
    config: {
      auth: { mode: 'try' },
      handler: { view: { template: 'register' } },
      description: 'Register sweet home (desc)',
      tags: ['auth']
    }
  })

  server.route({
    method: 'POST',
    path: '/register',
    config: {
      auth: { mode: 'try' },
      handler: registerUser,
      description: 'Register sweet home',
      tags: ['auth']
    }
  })

  server.route({
    method: 'GET',
    path: '/login',
    config: {
      auth: { mode: 'try' },
      handler: { view: { template: 'login' } },
      description: 'Login sweet home (desc)',
      tags: ['auth']
    }
  })

  server.route({
    method: 'POST',
    path: '/login',
    config: {
      auth: { mode: 'try' },
      handler: login,
      description: 'Login sweet home (desc)',
      tags: ['auth']
    }
  })

  server.route({
    method: 'POST',
    path: '/user/{name}/refresh',
    config: {
      handler: refresh,
      tags: ['user'],
      validate: {
        params: {
          name: joi.string()
            .required()
            .description('The username for \'it\'.')
        }
      }
    }
  })

  server.route({
    method: 'POST',
    path: '/logout',
    config: {
      handler: logout,
      tags: ['auth']
    }
  })

  server.route({
    method: 'GET',
    path: '/',
    config: {
      handler: { view: { template: 'home' } },
      description: 'Home sweet home (desc)',
      notes: 'Home sweet home, a note',
      tags: ['fi', 'fe', 'fo']
    }
  })

  server.route({
    method: 'GET',
    path: '/load',
    config: {
      handler: serverLoad,
      description: 'Charge du serveur',
      tags: ['server']
    }
  })

  server.route({
    method: 'GET',
    path: '/user/{name}',
    config: {
      handler: user,
      description: 'User sweet home (desc)',
      tags: ['user'],
      validate: {
        params: {
          name: joi.string()
            .required()
            .description('The username for \'it\'.')
        }
      }
    }
  })

  next()
}

const userChanges = () => {
  const usersFeed = userDB.follow({ include_docs: true, since: 'now' })
  usersFeed.on('change', (change) => {
    debug('CHANGE:', change.seq)
    if (change.doc && change.doc.contribs) { return }
    if (change.delete) { return }
    fetchContribs(change.doc.name)
      .then((contribs) => {
        change.doc.contribs = contribs
        userDB.insert(change.doc, (err, body) => {
          if (err) {
            debug('insert user contribs error:', err)
          } else {
            debug('BODY:', body.id, body.rev)
          }
        })
      })
  })
  usersFeed.follow()
}

exports.register = (server, options, next) => {
  debug('register...')
  userChanges()
  dailyUpdates()
  server.dependency(['hapi-auth-couchdb-cookie', 'hapi-context-credentials', 'vision', 'visionary'], after)
  next()
}

exports.register.attributes = {
  name: 'login',
  version: '0.1.0'
}
