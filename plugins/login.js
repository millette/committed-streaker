'use strict'

const joi = require('joi')
const nano = require('nano')('http://localhost:5984')
// const debug = require('debug')('yummy')

const registerUser = (request) => new Promise((resolve, reject) => {
  nano.use('_users').insert({
    _id: 'org.couchdb.user:' + request.payload.name,
    name: request.payload.name,
    password: request.payload.password,
    roles: [],
    type: 'user'
  },
  (err, resp) => {
    if (err) { return reject(err) }
    resolve(resp)
  })
})

const after = (server, next) => {
  server.auth.strategy('default', 'couchdb-cookie', true, {
    /*
    validateFunc: (session, cb) => {
      debug('server:', Object.keys(server))
      debug('session:', session)
      nano.session((err, ses) => {
        debug('nano.session err:', err)
        debug('nano.session:', ses)
      })
      cb(null, true, session)
    },
    */
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
      handler: (request, reply) => registerUser(request)
        .then(() => {
          request.auth.session.authenticate(
            request.payload.name,
            request.payload.password,
            () => reply.redirect('/')
          )
        })
        .catch(() => reply.redirect('/register')),
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
      handler: (request, reply) => {
        request.auth.session.authenticate(
          request.payload.name,
          request.payload.password,
          () => reply.redirect('/')
        )
      },
      description: 'Login sweet home (desc)',
      tags: ['auth']
    }
  })

  server.route({
    method: 'POST',
    path: '/logout',
    config: {
      handler: (request, reply) => {
        request.auth.session.clear()
        return reply.redirect('/')
      },
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
      handler: (request, reply) => {
        reply.view('home', { load: request.server.load })
      },
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

  next()
}

exports.register = (server, options, next) => {
  server.dependency(['hapi-auth-couchdb-cookie', 'hapi-context-credentials', 'vision', 'visionary'], after)
  next()
}

exports.register.attributes = {
  'name': 'login',
  'version': '0.0.1'
}
