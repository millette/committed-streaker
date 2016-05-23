'use strict'

module.exports = (services) => {
  services.router.get('/', (req, res) => res.render('home', { user: req.user }))
  return services.router
}
