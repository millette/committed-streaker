'use strict'

// npm
const joi = require('joi')
const boom = require('boom')
const streak = require('rollodeqc-gh-user-streak')
const debug = require('debug')('yummy')
const pick = require('lodash.pick')
// const shuffle = require('lodash.shuffle')
const nano = require('nano')('http://localhost:5984')

const userDB = nano.use('u2')

const fetchContribs = (name) => streak.fetchContribs(name)
  .then((contribs) => {
    const contribs2 = { }
    contribs.forEach((c) => { contribs2[c.date] = c.count })
    return contribs2
  })

const couchUser = (name) => `org.couchdb.user:${name}`

// const couchUserToName = (resp) => resp.id.slice(17) // 'org.couchdb.user:'.length === 17

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
    if (!ps[0].contribs) { ps[0].contribs = { } }
    Object.assign(ps[0].contribs, ps[1]) // ps[1].filter((z) => z.count)
    return putUser(ps[0])
  })

/*
const dailyUpdates = (onStart) => {
  userDB.list({ startkey: 'org.couchdb.user:' }, (err, body) => {
    if (err) { return debug('dailyUpdates error: %s', err) }
    // const delay = 21600000 / body.rows.length // spread over 6h
    const delay = 5400000 / body.rows.length // spread over 90m
    // const delay = 1800000 / body.rows.length // spread over 30m
    // const delay = 19440000 / body.rows.length // spread over 5.4h
    // const delay = 86400000 / body.rows.length // spread over 1d

    shuffle(body.rows).forEach((r, k) => {
      debug('setup contrib updates for %s', r)
      setTimeout((name) => {
        debug('contrib updates ready for %s', name)
        if (onStart) { refreshImp(name) }
        setInterval(refreshImp.bind(null, name), 86400000)
      }, k * delay, couchUserToName(r))
    })
  })
}
*/

const refresh = (request, reply) => refreshImp(request.params.name)
  .then(() => reply.redirect(`/user/${request.params.name}`))
  .catch((err) => {
    debug('refresh error: %s', err)
    reply.redirect(`/user/${request.params.name}`)
  })

/*
const login = (request, reply) => request.auth.session.authenticate(
  request.payload.name,
  request.payload.password,
  () => reply.redirect(`/user/${request.payload.name}`)
)
*/

const login = (request, reply) => {
  if (!request.auth.isAuthenticated) {
    return reply(boom.unauthorized('Authentication failed: ' + request.auth.error.message))
  }

  request.cookieAuth.set(request.auth.credentials)
  return reply.redirect(`/user/${request.auth.credentials.profile.username}`)
}

/*
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
*/

/*
const logout = (request, reply) => {
  request.auth.session.clear()
  // request.cookieAuth.clear() // bad
  return reply.redirect('/')
}
*/

const serverLoad = (request, reply) => {
  request.server.load.uptime = process.uptime()
  reply.view('home', { load: request.server.load })
}

const serverLoadJson = (request, reply) => {
  request.server.load.uptime = process.uptime()
  reply(request.server.load)
}

const user = (request, reply) => getUser(request.params.name)
  .then((body) => {
    const doc = pick(body, ['name', 'contribs', '_rev'])
    reply.view('user', { user: doc }).etag(body._rev)
  })
  .catch((err) => {
    debug('get user error: %s', err)
    reply.redirect('/')
  })

const after = (server, next) => {
  debug('after...')
  server.auth.strategy('session', 'cookie', true, {
    password: process.env.SESSION_PASSWORD,
    redirectTo: '/login',
    isSecure: false
    // redirectOnTry: false
  })

  server.auth.strategy('github', 'bell', {
    provider: 'github',
    password: process.env.GITHUB_PASSWORD,
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    // redirectTo: '/login',
    isSecure: false
    // redirectOnTry: false
  })

/*
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
*/

  server.route({
    method: 'GET',
    path: '/login',
    config: {
      auth: 'github',
      // auth: { mode: 'try' },
      // handler: { view: { template: 'login' } },
      handler: login,
      description: 'Login sweet home (desc)',
      tags: ['auth']
    }
  })

/*
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
*/

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

/*
  server.route({
    method: 'POST',
    path: '/logout',
    config: {
      handler: logout,
      tags: ['auth']
    }
  })
*/

  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: 'session',
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
    path: '/load/json',
    config: {
      handler: serverLoadJson,
      description: 'Charge du serveur',
      tags: ['server', 'json']
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
    if (change.doc && change.doc.contribs) { return }
    if (change.delete) { return }
    debug('CHANGE %s %s', change.id, change.seq)
    fetchContribs(change.doc.name)
      .then((contribs) => {
        change.doc.contribs = contribs
        putUser(change.doc)
          .then((body) => debug('BODY %s %s', body.id, body.rev))
          .catch((err) => debug('insert user contribs error: %s', err))
      })
  })
  usersFeed.follow()
}

exports.register = (server, options, next) => {
  debug('register...')
  userChanges()
  // dailyUpdates(true)
  server.dependency(['hapi-auth-cookie', 'bell', 'hapi-context-credentials', 'vision', 'visionary'], after)
  next()
}

exports.register.attributes = {
  name: 'login',
  version: '0.1.0'
}
