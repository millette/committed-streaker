'use strict'

// npm
const debug = require('debug')('app')

module.exports = (services) => {
  services.router.get('/', (req, res) => {
    debug('HOME RENDER')
    res.render('home', { title: 'Committed Streaker | Accueil | Home', user: req.user })
  })

  services.router.get('/a-propos', (req, res) => {
    debug('A-PROPOS RENDER')
    res.render('a-propos', { title: 'À propos du service', user: req.user })
  })

  services.router.get('/about', (req, res) => {
    debug('ABOUT RENDER')
    res.render('about', { title: 'About this service', user: req.user })
  })

  debug('HOME READY')
  return services.router
}
