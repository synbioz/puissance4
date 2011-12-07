PORT = 8000

socket = game = running = null

addMessage = (content) ->
  node = new Element("li").update(content)
  $('messages').insert({ top: node })

setMyColor = (position) ->
  $('iam').addClassName("player_#{position}")

setCurrentPlayer = (position) ->
  $('who_plays').className = "player_#{position}"

cleanGrid = ->
  board = $('puissance4')
  board.down().childElements().each (line) ->
    line.childElements().each (column) ->
      column.className = ""

cleanYouAndCurrent = ->
  $('iam').className = ""
  $('who_plays').className = "player_0"

cleanMessages = ->
  $("messages").childElements().each (node) ->
    node.remove()
  addMessage "Waiting for you"

clean = ->
  cleanGrid()
  cleanYouAndCurrent()
  cleanMessages()

finish = ->
  game = running = null
  $('start').enable()

initialize = ->
  socket = io.connect "http://localhost:#{PORT}"
  start_button = $('start')

  start_button.observe 'click', (event) ->
    clean()
    socket.emit 'game:start'
    socket.on 'game:registered', (data) ->
      addMessage "You're registered."
      game = [data.number, data.position]
      setMyColor(data.position)
    socket.on 'game:not_registered', ->
      addMessage "No game available."
    socket.on 'game:started', ->
      start_button.disable()
      running = true
      addMessage "Let's go."

  initializeBoard()

getBoardPosition = (board, node) ->
  lines ?= board.down().childElements()
  line = node.up("tr")
  cols = line.childElements()

  line_number = lines.indexOf(line)
  col_number  = line.childElements().indexOf(node)

  [line_number, col_number]

playAt = (board, player, line, column) ->
  l = board.down().childElements()[line]
  c = l.childElements()[column]
  c.addClassName("player_#{player}")

initializeBoard = ->
  board = $('puissance4')

  board.observe 'click', (event) ->
    [line, col] = getBoardPosition(board, event.target)
    if game
      if running
        socket.emit "game:play", { line: line, column: col, game: game[0], player: game[1] }
      else
        addMessage "Wait for an other player."
    else
      addMessage "Please start a game."

  socket.on "game:played", (data) ->
    playAt(board, data.player, data.line, data.column)

  socket.on "game:wait", ->
    addMessage "Wait, not your turn."

  socket.on "game:box_not_available", ->
    addMessage "Can't play here, try again."

  socket.on "game:win", ->
    addMessage "You won."
    finish()

  socket.on "game:loose", ->
    addMessage "You lost."
    finish()

  socket.on "game:set_current_player", (data) ->
    setCurrentPlayer(data.player)

document.observe "dom:loaded", initialize