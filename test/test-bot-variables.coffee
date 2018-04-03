TestCase = require("./test-base")

################################################################################
# Bot Variable Tests
################################################################################

exports.test_bot_variables = (test) ->
   bot = new TestCase(test, """
    ! var name = Aiden
    ! var age = 5

    + what is your name
    - My name is <bot name>.

    + how old are you
    - I am <bot age>.

    + what are you
    - I'm <bot gender>.

    + happy birthday
    - <bot age=6>Thanks!
   """)
   bot.reply("What is your name?", "My name is Aiden.")
   bot.reply("How old are you?", "I am 5.")
   bot.reply("What are you?", "I'm undefined.")
   bot.reply("Happy birthday!", "Thanks!")
   bot.reply("How old are you?", "I am 6.")
   bot.botvar("age", "6")
   bot.botvars({name: "Aiden", age: "6"})
   test.done()

exports.test_global_variables = (test) ->
  bot = new TestCase(test, """
    ! global debug = false

    + debug mode
    - Debug mode is: <env debug>

    + set debug mode *
    - <env debug=<star>>Switched to <star>.
  """)
  bot.reply("Debug mode.", "Debug mode is: false")
  bot.reply("Set debug mode true", "Switched to true.")
  bot.reply("Debug mode?", "Debug mode is: true")
  test.done()

exports.test_bot_variable_override = (test) ->
  bot = new TestCase(test, """
    + *
    - N/A
  """, historyCount: 3)
  bot.rs.setUservars('user', __history__: reply: ["A"], input: ["a"])
  history = bot.rs.getUservar('user', '__history__')
  bot.assertEquals(history.input, ['a', 'undefined', 'undefined']);
  bot.assertEquals(history.reply, ['A', 'undefined', 'undefined']);

  bot.rs.setUservars('user', __history__: reply: ["A", "B", "C", "D", "E"], input: ["a", "b", "c", "d", "e"])
  history = bot.rs.getUservar('user', '__history__')
  bot.assertEquals(history.input, ['a', 'b', 'c']);
  bot.assertEquals(history.reply, ['A', 'B', 'C']);

  test.done()
