'use strict'

// npm
const joi = require('joi')
const boom = require('boom')
const streak = require('rollodeqc-gh-user-streak')
const debug = require('debug')('yummy')
const pick = require('lodash.pick')

// self
const utils = require('../lib/utils')

const authGithub = (request, reply) => {
  if (!request.auth.isAuthenticated) {
    return reply(boom.unauthorized('Authentication failed: ' + request.auth.error.message))
  }

  request.cookieAuth.set({ username: request.auth.credentials.profile.username })
  utils.getUser(request.auth.credentials.profile.username)
    .then((userDoc) => {
      debug('authgithub put user %s', request.auth.credentials.profile.username)
      utils.putUser(Object.assign(userDoc, request.auth.credentials.profile))
      return reply.redirect(`/user/${request.auth.credentials.profile.username}`)
    })
    .catch((err) => {
      debug('ERROR authgithub put user %s', request.auth.credentials.profile.username)
      if (err.statusCode === 404) {
        debug('ERROR 404 authgithub put user %s', request.auth.credentials.profile.username)
        const userDoc = request.auth.credentials.profile
        userDoc.username = request.auth.credentials.profile.username
        userDoc.name = request.auth.credentials.profile.username
        utils.putUser(userDoc)
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
  if (!request.auth.isAuthenticated || !request.auth.credentials || request.auth.credentials.username !== 'millette') {
    return reply(boom.unauthorized('Authentication failed for this page.'))
  }
  request.server.load.uptime = process.uptime()
  reply.view('load', { load: request.server.load })
}

const serverLoadJson = (request, reply) => {
  if (!request.auth.isAuthenticated || !request.auth.credentials || request.auth.credentials.username !== 'millette') {
    return reply(boom.unauthorized('Authentication failed for this page.'))
  }
  request.server.load.uptime = process.uptime()
  reply(request.server.load)
}

const userFull = (request, reply) => request.auth.credentials.username === request.params.name
  ? utils.getUser(request.params.name)
    .then((body) => reply.view('user', { streaks: false, user: body, me: false }).etag(body._rev))
    .catch((err) => {
      debug('get user error: %s', err)
      return reply(boom.notFound(err))
    })
  : reply(boom.unauthorized(`Authentication failed: '${request.auth.credentials.username}' !== '${request.params.name}'`))

const daily = (request, reply) => {
  const now = new Date(new Date().getTime() - utils.dayUnit / 8)
  if (!request.params.year) { request.params.year = now.getFullYear() }
  if (!request.params.month) { request.params.month = now.getMonth() + 1 }
  if (!request.params.day) { request.params.day = now.getDate() }

  const d = new Date(request.params.year, request.params.month - 1, request.params.day)
  const tomorrow = (now.getTime() - d.getTime()) / utils.dayUnit > 1
    ? new Date(d.getTime() + utils.dayUnit).toISOString().split('T')[0].replace(/-/g, '/')
    : false
  const yesterday = (now.getTime() - d.getTime()) / utils.dayUnit < 400
    ? new Date(d.getTime() - utils.dayUnit).toISOString().split('T')[0].replace(/-/g, '/')
    : false

  const options = {
    descending: true,
    stale: 'update_after',
    startkey: [request.params.year, request.params.month, request.params.day + 1],
    endkey: [request.params.year, request.params.month, request.params.day]
  }
  // if (request.params.limit) { options.limit = request.params.limit }
  utils.userDB.view('app', 'commitsByDate', options, (err, body) => {
    if (err) {
      debug('dbview error: %s', err)
      return reply(boom.badImplementation('Oups: ', err))
    }

    let commits
    if (request.params.limit) {
      commits = body.rows.slice(0, request.params.limit)
    } else {
      commits = body.rows.slice()
    }

    commits = commits.map((x) => {
      return {
        username: utils.couchUserToName(x),
        commits: x.key[3]
      }
    })

    const rep = reply.view('day', {
      total: body.rows.length,
      yesterday: yesterday,
      tomorrow: tomorrow,
      date: d.toLocaleDateString(),
      commits: commits
    })
    if ((now.getTime() - d.getTime()) / utils.dayUnit > 3) { rep.etag(d + request.params.limit) }
  })
}

const userImp = (me, request, reply) => {
  const username = me
    ? request.auth.credentials.username
    : request.params.name || 'millette'
  return utils.getUser(username)
  .then((body) => {
    const cc = []
    let r
    for (r in body.contribs) {
      cc.push({
        date: r,
        count: body.contribs[r]
      })
    }
    const streaks = streak(cc.sort((a, b) => {
      if (a.date > b.date) { return 1 }
      if (a.date < b.date) { return -1 }
      return 0
    }))

    return Promise.all([body, streaks])
  })
  .then((x) => {
    const s = x[1].streaks
    const v = s.slice().sort((a, b) => {
      if (a.begin > b.begin) { return 1 }
      if (a.begin < b.begin) { return -1 }
      return 0
    }).reverse()[0]
    const m = Object.keys(x[0].contribs).sort((a, b) => {
      if (a > b) { return 1 }
      if (a < b) { return -1 }
      return 0
    }).reverse()[0]
    const d = new Date(Date.parse(v.begin) + (v.commits.length - 1) * utils.dayUnit).toISOString().split('T')[0]
    if (d === m) { s.forEach((r) => { if (r.begin === v.begin) { r.current = true } }) }
    return reply
      .view('user', { streaks: s, user: pick(x[0], ['name', '_rev']), me: me })
      .etag(x[0]._rev)
  })
  .catch((err) => {
    debug('get user %s not found: %s', username, err)
    return reply(boom.notFound(err, { username }))
  })
}

const user = userImp.bind(null, false)
const me = userImp.bind(null, true)

const preResponse = (request, reply) => {
  if (!request.response.isBoom) { return reply.continue() }
  const code = request.response.output.payload.statusCode || 500
  const obj = {
    credentials: false,
    app: request.server.settings.app,
    output: request.response.output.payload
  }
  let view

  switch (code) {
    case 400:
    case 401:
    case 404:
      view = `${code}`
      break

    default:
      view = 'error'
  }
  reply.view(view, obj).code(code)
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
    path: '/a-propos',
    config: {
      auth: { mode: 'try' },
      handler: { view: { template: 'about' } },
      description: 'About',
      tags: ['app']
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
    path: '/user/millette',
    config: {
      auth: { mode: 'try' },
      handler: user,
      description: 'User millette (desc)',
      tags: ['user']
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
      auth: { mode: 'try' },
      handler: daily,
      description: 'Dailies',
      tags: ['commits'],
      validate: {
        params: {
          limit: joi.number()
            .integer()
            .min(0)
            .max(500)
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
            .integer()
            .min(2000)
            .max(2020)
            .required(),
          month: joi.number()
            .integer()
            .min(1)
            .max(12)
            .required(),
          day: joi.number()
            .integer()
            .min(1)
            .max(31)
            .required(),
          limit: joi.number()
            .integer()
            .min(0)
            .max(500)
            .default(25)
        }
      }
    }
  })

  next()
}

const userChanges = () => {
  const usersFeed = utils.userDB.follow({ include_docs: true, since: 'now' })
  usersFeed.on('change', (change) => {
    // debug('1) CHANGE %s', Object.keys(change).join(', '))
    if (change.doc && change.doc.contribs) { return }
    if (change.delete) { return }
    if (change.id.indexOf('_design/') === 0) { return }
    debug('2) CHANGE %s %s', change.id, change.seq)
    utils.fetchContribs(change.doc.name)
      .then((contribs) => {
        change.doc.contribs = contribs
        utils.putUser(change.doc)
          .then((body) => debug('BODY %s %s', body.id, body.rev))
          .catch((err) => debug('insert user contribs error: %s', err))
      })
  })
  usersFeed.follow()
}

exports.register = (server, options, next) => {
  debug('register...')
  userChanges()
  server.ext('onPreResponse', preResponse)
  server.dependency(['hapi-auth-cookie', 'bell', 'hapi-context-credentials', 'vision', 'visionary'], after.bind(null, options))
  next()
}

exports.register.attributes = {
  name: 'login',
  version: '0.1.0'
}
