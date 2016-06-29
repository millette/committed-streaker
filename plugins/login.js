'use strict'

const joi = require('joi')
const nano = require('nano')('http://localhost:5984')
const streak = require('rollodeqc-gh-user-streak')
const debug = require('debug')('yummy')

const userDB = nano.use('_users')

const usersFeed = userDB.follow({ include_docs: true, since: 'now' })

usersFeed.on('change', (change) => {
  debug('CHANGE:', change)
  if (change.doc && change.doc.contribs) { return }
  if (change.delete) { return }
  streak.fetchContribs(change.doc.name)
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

const login = (request, reply) => request.auth.session.authenticate(
  request.payload.name,
  request.payload.password,
  () => reply.redirect('/user/' + request.payload.name)
)

const registerUser = (request, reply) => !request.payload.password || request.payload.password !== request.payload.password2
  ? reply.redirect('/register')
  : userDB.insert(
    {
      _id: 'org.couchdb.user:' + request.payload.name,
      name: request.payload.name,
      password: request.payload.password,
      roles: [],
      type: 'user'
    },
    (err) => err ? reply.redirect('/register') : login(request, reply)
  )

const logout = (request, reply) => {
  request.auth.session.clear()
  return reply.redirect('/')
}

const serverLoad = (request, reply) => reply.view('home', { load: request.server.load })

const user = (request, reply) => {
  // reply(streak.fetchContribs(request.params.user))
  // reply(streak(request.params.user))
  userDB.get('org.couchdb.user:' + request.params.user, (err, body) => {
    if (err) { return reply.redirect('/') }
    reply.view('user', {
      user: {
        name: body.name,
        contribs: body.contribs
      }
    }).etag(body._rev)
  })
}

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
    path: '/it/{it}',
    config: {
      handler: { view: { template: 'home' } },
      description: 'It sweet home (desc)',
      notes: 'It sweet home, a note',
      tags: ['it', 'fe'],
      validate: {
        params: {
          it: joi.number()
            .required()
            .description('The number for \'it\'.')
        }
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/user/{user}',
    config: {
      handler: user,
      // handler: { view: { template: 'home' } },
      description: 'User sweet home (desc)',
      tags: ['user'],
      validate: {
        params: {
          user: joi.string()
            .required()
            .description('The username for \'it\'.')
        }
      }
    }
  })

  next()
}

exports.register = (server, options, next) => {
  server.dependency(['hapi-auth-couchdb-cookie', 'hapi-context-credentials', 'vision', 'visionary'], after)
  next()
}

exports.register.attributes = {
  name: 'login',
  version: '0.1.0'
}
