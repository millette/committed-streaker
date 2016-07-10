#!/usr/bin/env node

'use strict'

// self
const utils = require('./lib/utils')

utils.dailyUpdates()
setInterval(utils.dailyUpdates, utils.dayUnit / 4)
