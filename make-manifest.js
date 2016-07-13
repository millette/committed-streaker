#!/usr/bin/env node

'use strict'

// core
const fs = require('fs')

const isProd = process.argv[2] === 'prod'

const manifest = {
  server: {
    app: {
      siteTitle: 'Committed Streaker',
      nav: {
        left: [
          { path: '/', text: 'Accueil' },
          { path: '/today', text: 'Codeurs actifs' }
        ],
        right: [
          { path: '/a-propos', text: 'À propos' }
        ]
      }
    },
    load: { sampleInterval: 1000 }
  },
  connections: [{ port: 3040, address: '127.0.0.1' }],
  registrations: [
    { plugin: 'hapi-context-credentials' },
    { plugin: 'hapi-auth-cookie' },
    { plugin: 'bell' },
    { plugin: 'hapi-context-app' },
    {
      plugin: {
        register: './plugins/login',
        options: { secureCookies: false }
      }
    },
    { plugin: 'vision' },
    {
      plugin: {
        register: 'visionary',
        options: {
          engines: { 'ejs': 'ejs' },
          path: 'views',
          isCached: isProd
        }
      }
    },
    {
      plugin: {
        register: 'hapi-favicon',
        options: { path: './favicon.ico', auth: false }
      }
    }
  ]
}

const devRegistrations = [
  { plugin: 'inert' },
  { plugin: 'lout' },
  {
    plugin: {
      register: 'good',
      options: {
        reporters: {
          console: [
            {
              module: 'good-squeeze',
              name: 'Squeeze',
              args: [{
                response: '*',
                log: '*'
              }]
            },
            { module: 'good-console' },
            'stdout'
          ]
        }
      }
    }
  }
]

if (!isProd) {
  manifest.registrations = manifest.registrations.concat(devRegistrations)
  manifest.server.app.nav.right.push({ path: '/docs', text: 'API docs' })
}

fs.writeFile('manifest.json', JSON.stringify(manifest, null, '  '), () => {
  console.log(`${isProd ? 'prod' : 'dev'} "manifest.json" written`)
})
