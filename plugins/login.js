'use strict'

// npm
const joi = require('joi')
const streak = require('rollodeqc-gh-user-streak')
const debug = require('debug')('yummy')
const pick = require('lodash.pick')
const nano = require('nano')('http://localhost:5984')

const userDB = nano.use('_users')

const fetchContribs = (name) => streak.fetchContribs(name)
  .then((contribs) => {
    const contribs2 = { }
    contribs.forEach((c) => { contribs2[c.date] = c.count })
    return contribs2
  })

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

const refresh = (request, reply) => getUser(request.params.name)
  .then((userDoc) => Promise.all([userDoc, fetchContribs(userDoc.name)]))
  .then((zzz) => {
    Object.assign(zzz[0].contribs, zzz[1])
    return putUser(zzz[0])
  })
  .then((zzz) => reply.redirect(`/user/${request.params.name}`))
  .catch((err) => {
    debug('refresh error:', err)
    reply.redirect(`/user/${request.params.name}`)
  })

const login = (request, reply) => request.auth.session.authenticate(
  request.payload.name,
  request.payload.password,
  () => reply.redirect(`/user/${request.payload.name}`)
)

const couchUser = (name) => `org.couchdb.user:${name}`

const registerUser = (request, reply) => {
  if (request.payload.password && request.payload.password === request.payload.password2) {
    putUser({
      _id: couchUser(request.payload.name),
      name: request.payload.name,
      password: request.payload.password,
      roles: [],
      type: 'user'
    })
      .then((a) => login(request, reply))
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
  userChanges()
  server.dependency(['hapi-auth-couchdb-cookie', 'hapi-context-credentials', 'vision', 'visionary'], after)
  next()
}

exports.register.attributes = {
  name: 'login',
  version: '0.1.0'
}
