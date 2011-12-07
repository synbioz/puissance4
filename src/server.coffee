PORT = 8000
LINES = 6
COLS = 7

class Game
  MAX_GAMES = 2
  @games    = []

  @count: ->
    @games.length

  @isAvailable: ->
    @count() < MAX_GAMES

  @addGame: (game) ->
    @games.push(game)

  @findOrCreate: (player) ->
    for game in @games
      if game.isAvailable()
        game.addPlayer(player)
        return [game, 1]

    if Game.isAvailable()
      [new Game(player), 0]
    else
      false

  constructor: (player)->
    @matrix = []
    @matrix[num] = new Array(COLS) for num in [0...LINES]
    @players  = [player]
    @position = Game.count()
    Game.addGame(this)
    @current_player = 0

  addPlayer: (player) ->
    @players.push(player)

  broadcastCurrentPlayer: ->
    for player in @players
      player.emit 'game:set_current_player', { player: @current_player}

  findPlayerByNum: (num) ->
    @players[num]

  changePlayer: ->
    @current_player = (@current_player + 1) % 2
    @broadcastCurrentPlayer()

  lineCombinations: (column) ->
    combinations = [
      [0, 1, 2, 3]
      [1, 2, 3, 4]
      [2, 3, 4, 5]
      [3, 4, 5, 6]
    ]
    c = []
    for combination in combinations
      c.push(combination) if combination.indexOf(column) > -1
    c

  isLineWinningMove: (line, column, number) ->
    for combination in @lineCombinations(column)
      winned = true
      for num in combination
        winned = false if @matrix[line][num] != number
      return winned if winned
    false

  columnCombinations: (line) ->
    combinations = [
      [0, 1, 2, 3]
      [1, 2, 3, 4]
      [2, 3, 4, 5]
    ]
    c = []
    for combination in combinations
      c.push(combination) if combination.indexOf(line) > -1
    c

  isColumnWinningMove: (line, column, number) ->
    for combination in @columnCombinations(line)

      winned = true
      for num in combination
        winned = false if @matrix[num][column] != number
      return winned if winned
    false

  isDiagonalWinningMove: (line, column, number) ->
    # TODO
    false

  isWinningMove: (line, column, number) ->
    @isColumnWinningMove(line, column, number)    ||
    @isLineWinningMove(line, column, number)      ||
    @isDiagonalWinningMove(line, column, number)

  start: ->
    console.log "starting game from server…"

  stop: ->
    index = Game.games.indexOf(this)
    Game.games = Game.games.splice(index, 1)

  isRunning: ->
    @players.length == 2

  isAvailable: ->
    @players.length < 2

  isFilled: (line, column) ->
    node = @matrix[line][column]
    node == 0 || node == 1

  playAt: (line, column, player_num) ->
    player_1 = @findPlayerByNum(player_num)
    player_2 = @findPlayerByNum((player_num + 1) % 2)

    for num in [(LINES - 1)..0]
      unless @isFilled(num, column)
        @matrix[num][column] = player_num
        data = { line: num, column: column, player: player_num }
        player_1.emit "game:played", data
        player_2.emit "game:played", data
        @changePlayer()
        if @isWinningMove(num, column, player_num)
          player_1.emit "game:win"
          player_2.emit "game:loose"
          @stop()
        return

    player_2.emit "game:box_not_available"

  play: (player_num, line, column) ->
    player = @findPlayerByNum(player_num)
    other_num = (player_num + 1) % 2
    other_player = @players[other_num]
    if @current_player == player_num
      @playAt(line, column, player_num)
    else
      player.emit "game:wait"

# Start server
io = require('socket.io').listen(PORT)

io.sockets.on 'connection', (socket) ->
  socket.on 'game:start', (data) ->
    [game, player_position] = Game.findOrCreate(socket)
    if game
      socket.emit 'game:registered', { number: game.position, position: player_position }
      if game.isRunning()
        for player in game.players
          player.emit 'game:started'
    else
      socket.emit 'game:not_registered'

  socket.on 'game:play', (data) ->
    game    = Game.games[data.game]
    player  = data.player
    line    = data.line
    column  = data.column
    game.play(player, line, column)