'use strict'

// npm
const joi = require('joi')
const boom = require('boom')
const streak = require('rollodeqc-gh-user-streak')
const debug = require('debug')('yummy')
const pick = require('lodash.pick')
const nano = require('nano')('http://localhost:5984')
const shuffle = require('lodash.shuffle')

const couchUserToName = (resp) => resp.id.slice(17) // 'org.couchdb.user:'.length === 17

const userDB = nano.use('u2')

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
  const now = new Date().toISOString().split('.')[0] + 'Z'
  if (!userDoc.created_at) { userDoc.created_at = now }
  userDoc.updated_at = now
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

const refresh = (request, reply) => refreshImp(request.params.name)
  .then(() => reply.redirect(`/user/${request.params.name}`))
  .catch((err) => {
    debug('refresh error: %s', err)
    reply.redirect(`/user/${request.params.name}`)
  })

const authGithub = (request, reply) => {
  if (!request.auth.isAuthenticated) {
    return reply(boom.unauthorized('Authentication failed: ' + request.auth.error.message))
  }

  request.cookieAuth.set({ username: request.auth.credentials.profile.username })
  getUser(request.auth.credentials.profile.username)
    .then((userDoc) => {
      putUser(Object.assign(userDoc, request.auth.credentials.profile))
    })
  return reply.redirect(`/user/${request.auth.credentials.profile.username}`)
}

const serverLoad = (request, reply) => {
  request.server.load.uptime = process.uptime()
  reply.view('home', { load: request.server.load })
}

const serverLoadJson = (request, reply) => {
  request.server.load.uptime = process.uptime()
  reply(request.server.load)
}

const userFull = (request, reply) => getUser(request.params.name)
  .then((body) => {
    reply.view('user', { user: body }).etag(body._rev)
  })
  .catch((err) => {
    debug('get user error: %s', err)
    reply.redirect('/')
  })

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
    isSecure: false
  })

  server.auth.strategy('github', 'bell', {
    provider: 'github',
    password: process.env.GITHUB_PASSWORD,
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    isSecure: false
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
    method: 'GET',
    path: '/auth/github',
    config: {
      auth: 'github',
      handler: authGithub,
      description: 'Auth with github (desc)',
      tags: ['auth', 'github', 'user']
    }
  })

  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: { mode: 'try' },
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

  server.route({
    method: 'GET',
    path: '/user/{name}/full',
    config: {
      handler: userFull,
      description: 'Userfull',
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
    if (change.id.indexOf('_design/') === 0) { return }
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

const dailyUpdates = (onStart) => {
  if (onStart === 'dont') { return }
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

exports.register = (server, options, next) => {
  debug('register...')
  userChanges()
  dailyUpdates('dont')
  server.dependency(['hapi-auth-cookie', 'bell', 'hapi-context-credentials', 'vision', 'visionary'], after)
  next()
}

exports.register.attributes = {
  name: 'login',
  version: '0.1.0'
}
