'use strict'

const joi = require('joi')
// const debug = require('debug')('yummy')

const after = (server, next) => {
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
  server.dependency(['vision', 'visionary'], after)
  next()
}

exports.register.attributes = {
  'name': 'login',
  'version': '0.0.1'
}
