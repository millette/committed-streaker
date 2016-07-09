'use strict'

// npm
const joi = require('joi')
const boom = require('boom')
const streak = require('rollodeqc-gh-user-streak')
const debug = require('debug')('yummy')
const pick = require('lodash.pick')
const userDB = require('nano')('http://localhost:5984/u2')
const shuffle = require('lodash.shuffle')

const dayUnit = 86400000
const couchUserToName = (resp) => resp.id.slice(17) // 'org.couchdb.user:'.length === 17

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
  if (!userDoc._id) { userDoc._id = couchUser(userDoc.name) }
  userDB.insert(userDoc, (err, change) => {
    if (err) { return reject(err) }
    resolve(change)
  })
})

const refresh = (name) => Promise.all([getUser(name), fetchContribs(name)])
  .then((ps) => {
    if (!ps[0].contribs) { ps[0].contribs = { } }
    Object.assign(ps[0].contribs, ps[1]) // ps[1].filter((z) => z.count)
    return putUser(ps[0])
  })

const authGithub = (request, reply) => {
  if (!request.auth.isAuthenticated) {
    return reply(boom.unauthorized('Authentication failed: ' + request.auth.error.message))
  }

  request.cookieAuth.set({ username: request.auth.credentials.profile.username })
  getUser(request.auth.credentials.profile.username)
    .then((userDoc) => {
      debug('authgithub put user %s', request.auth.credentials.profile.username)
      putUser(Object.assign(userDoc, request.auth.credentials.profile))
      return reply.redirect(`/user/${request.auth.credentials.profile.username}`)
    })
    .catch((err) => {
      debug('ERROR authgithub put user %s', request.auth.credentials.profile.username)
      if (err.statusCode === 404) {
        debug('ERROR 404 authgithub put user %s', request.auth.credentials.profile.username)
        const userDoc = request.auth.credentials.profile
        userDoc.username = request.auth.credentials.profile.username
        userDoc.name = request.auth.credentials.profile.username
        putUser(userDoc)
          .then((a) => {
            debug('AUTH PUT')
            return reply.redirect(`/user/${request.auth.credentials.profile.username}`)
          })
          .catch((e) => {
            debug('AUTH PUT %s', e)
            return reply.redirect(`/user/${request.auth.credentials.profile.username}`)
          })
      } else {
        debug('ERROR OTHER authgithub put user %s %s', request.auth.credentials.profile.username, err.statusCode)
        return reply(boom.badImplementation('Oups: ', err))
      }
    })
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
  .then((body) => reply.view('user', { user: body, me: false }).etag(body._rev))
  .catch((err) => {
    debug('get user error: %s', err)
    return reply(boom.notFound(err))
  })

const daily = (request, reply) => {
  const now = new Date()
  if (!request.params.year) { request.params.year = now.getFullYear() }
  if (!request.params.month) { request.params.month = now.getMonth() + 1 }
  if (!request.params.day) { request.params.day = now.getDate() }

  const d = new Date(request.params.year, request.params.month - 1, request.params.day)
  const tomorrow = (now.getTime() - d.getTime()) / dayUnit > 1
    ? new Date(d.getTime() + dayUnit).toISOString().split('T')[0].replace(/-/g, '/')
    : false
  const yesterday = (now.getTime() - d.getTime()) / dayUnit < 400
    ? new Date(d.getTime() - dayUnit).toISOString().split('T')[0].replace(/-/g, '/')
    : false

  const options = {
    descending: true,
    startkey: [request.params.year, request.params.month, request.params.day + 1],
    endkey: [request.params.year, request.params.month, request.params.day]
  }
  if (request.params.limit) { options.limit = request.params.limit }
  userDB.view('app', 'commitsByDate', options, (err, body) => {
    if (err) {
      debug('dbview error: %s', err)
      return reply(boom.badImplementation('Oups: ', err))
    }
    reply.view('day', {
      yesterday: yesterday,
      tomorrow: tomorrow,
      date: d.toLocaleDateString(),
      commits: body.rows.map((x) => {
        return {
          username: couchUserToName(x),
          commits: x.key[3]
        }
      })
    }).etag(d + request.params.limit)
  })
}

const user = (request, reply) => getUser(request.params.name)
  .then((body) => reply
    .view('user', { user: pick(body, ['name', 'contribs', '_rev']), me: false })
    .etag(body._rev))
  .catch((err) => {
    debug('get user error: %s', err)
    return reply(boom.notFound(err))
  })

const me = (request, reply) => getUser(request.auth.credentials.username)
  .then((body) => reply
    .view('user', { user: pick(body, ['name', 'contribs', '_rev']), me: true })
    .etag(body._rev))
  .catch((err) => {
    debug('get user error: %s', err)
    return reply(boom.notFound(err))
  })

const preResponse = (request, reply) => {
  if (!request.response.isBoom) { return reply.continue() }
  return reply.view('error', {
    credentials: request.auth.isAuthenticated ? request.auth.credentials : false,
    app: request.server.settings.app,
    output: request.response.output.payload
  })
}

const after = (options, server, next) => {
  debug('after...')
  server.auth.strategy('session', 'cookie', true, {
    password: process.env.SESSION_PASSWORD,
    isSecure: options.secureCookies
  })

  server.auth.strategy('github', 'bell', {
    provider: 'github',
    password: process.env.GITHUB_PASSWORD,
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    isSecure: options.secureCookies
  })

  server.route({
    method: 'GET',
    path: '/login/github/callback',
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
    path: '/me',
    config: {
      handler: me,
      description: 'User sweet home (desc)',
      tags: ['user']
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

  server.route({
    method: 'GET',
    path: '/today/{limit?}',
    config: {
      handler: daily,
      description: 'Dailies',
      tags: ['commits'],
      validate: {
        params: {
          limit: joi.number()
            .default(25)
        }
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/day/{year}/{month}/{day}/{limit?}',
    config: {
      handler: daily,
      description: 'Dailies',
      tags: ['commits'],
      validate: {
        params: {
          year: joi.number()
            .required(),
          month: joi.number()
            .required(),
          day: joi.number()
            .required(),
          limit: joi.number()
            .default(25)
        }
      }
    }
  })

  next()
}

const userChanges = () => {
  const usersFeed = userDB.follow({ include_docs: true, since: 'now' })
  usersFeed.on('change', (change) => {
    // debug('1) CHANGE %s', Object.keys(change).join(', '))
    if (change.doc && change.doc.contribs) { return }
    if (change.delete) { return }
    if (change.id.indexOf('_design/') === 0) { return }
    debug('2) CHANGE %s %s', change.id, change.seq)
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
  userDB.list({ startkey: 'org.couchdb.user:', endkey: 'org.couchdb.user:\ufff0' }, (err, body) => {
    if (err) { return debug('dailyUpdates error: %s', err) }
    const delay = 21600000 / body.rows.length // spread over 6h
    // const delay = 5400000 / body.rows.length // spread over 90m
    // const delay = 12600000 / body.rows.length // spread over 3.5h
    // const delay = 1800000 / body.rows.length // spread over 30m
    // const delay = 19440000 / body.rows.length // spread over 5.4h
    // const delay = 61200000 / body.rows.length // spread over 17h
    // const delay = dayUnit / body.rows.length // spread over 1d

    shuffle(body.rows).forEach((r, k) => {
      debug('setup contrib updates for %s', r.id)
      setTimeout((name) => {
        debug('contrib updates ready for %s', name)
        if (onStart) { refresh(name) }
        setInterval(refresh.bind(null, name), dayUnit)
      }, k * delay, couchUserToName(r))
    })
  })
}

exports.register = (server, options, next) => {
  debug('register...')
  userChanges()
  dailyUpdates('dont')
  server.dependency(['hapi-auth-cookie', 'bell', 'hapi-context-credentials', 'vision', 'visionary'], after.bind(null, options))
  server.ext('onPreResponse', preResponse)
  next()
}

exports.register.attributes = {
  name: 'login',
  version: '0.1.0'
}
