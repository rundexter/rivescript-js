#!/usr/bin/env coffee

################################################################################
# Run compile timer tests for a bot                                            #
################################################################################

q = require "q"
readline = require "readline"
fs = require "fs"
RiveScript = require "./src/rivescript"
CoffeeObjectHandler = require "./lib/lang/coffee"

################################################################################
# Accept command line parameters.
################################################################################

opts =
  debug: false
  utf8:  false
  times: 10
  brain: undefined

process.argv.slice(2).forEach((val, index, array) ->
  if val is "--debug"
    opts.debug = true
  else if val is "--utf8"
    opts.utf8 = true
  else if val.indexOf("--times") is 0
    opts.times = parseInt(val.replace('--times', ''), 10)
    if isNaN(opts.times)
      console.error("Invalid times - format is --times99")
      process.exit 1
  else if val.indexOf("-") is 0
    console.error "Unknown option: #{val}"
  else if opts.brain is undefined
    opts.brain = val
  else
    console.error "Extra parameter ignored: #{val}"
)

if opts.brain is undefined
  console.log "Usage: coffee timer.coffee [--debug --utf8 --times10] </path/to/brain>"
  process.exit 1

################################################################################
# Initialize the RiveScript bot and run the tests
################################################################################

totalTime = 0
parseTime = 0
promise = q()
for i in [0...opts.times]
  promise = promise
    .then () ->
      process.stdout.write('.')
      tstart = Date.now()
      bot = null
      deferred = q.defer()

      loadingDone = (batchNumber) ->
        bot.sortReplies()
        bot.ready = true
        totalTime += (Date.now() - tstart)
        deferred.resolve()

      loadingError = (error, batchNumber) ->
        deferred.reject(error)

      onStats = (src, data) ->
        if src is "parser.parse"
          parseTime += data.times.duration
			
      onDebug = () ->
        # Squash warnings unless we're in debug mode
        if opts.debug is true
          console.log.apply null, arguments
			
      bot = new RiveScript({
        debug: opts.debug
        utf8: opts.utf8
        onDebug
        onStats
      })
      bot.ready = false
      bot.setHandler("coffee", new CoffeeObjectHandler())
      bot.loadDirectory(opts.brain, loadingDone, loadingError)
      return deferred.promise
promise
  .then () ->
    console.log ""
    console.log "Avg load time: " + Math.floor(totalTime / opts.times) + "ms"
    console.log "Avg parse time: " + Math.floor(parseTime / opts.times) + "ms"
  .catch (e) ->
    console.error "Misc. error: ${error}"
    process.exit 1
