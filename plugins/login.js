'use strict'

const joi = require('joi')

exports.register = (server, options, next) => {
  // server.dependency(['vision', 'visionary']) // redundant with attributes.dependencies ?
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

exports.register.attributes = {
  // 'dependencies': ['vision', 'visionary'] // still need to order manifest.json correctly
  'name': 'login',
  'version': '0.0.1'
}
