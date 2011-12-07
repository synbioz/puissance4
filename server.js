(function() {
  var COLS, Game, LINES, PORT, io;

  PORT = 8000;

  LINES = 6;

  COLS = 7;

  Game = (function() {
    var MAX_GAMES;

    MAX_GAMES = 2;

    Game.games = [];

    Game.count = function() {
      return this.games.length;
    };

    Game.isAvailable = function() {
      return this.count() < MAX_GAMES;
    };

    Game.addGame = function(game) {
      return this.games.push(game);
    };

    Game.findOrCreate = function(player) {
      var game, _i, _len, _ref;
      _ref = this.games;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        game = _ref[_i];
        if (game.isAvailable()) {
          game.addPlayer(player);
          return [game, 1];
        }
      }
      if (Game.isAvailable()) {
        return [new Game(player), 0];
      } else {
        return false;
      }
    };

    function Game(player) {
      var num;
      this.matrix = [];
      for (num = 0; 0 <= LINES ? num < LINES : num > LINES; 0 <= LINES ? num++ : num--) {
        this.matrix[num] = new Array(COLS);
      }
      this.players = [player];
      this.position = Game.count();
      Game.addGame(this);
      this.current_player = 0;
    }

    Game.prototype.addPlayer = function(player) {
      return this.players.push(player);
    };

    Game.prototype.broadcastCurrentPlayer = function() {
      var player, _i, _len, _ref, _results;
      _ref = this.players;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        player = _ref[_i];
        _results.push(player.emit('game:set_current_player', {
          player: this.current_player
        }));
      }
      return _results;
    };

    Game.prototype.findPlayerByNum = function(num) {
      return this.players[num];
    };

    Game.prototype.changePlayer = function() {
      this.current_player = (this.current_player + 1) % 2;
      return this.broadcastCurrentPlayer();
    };

    Game.prototype.lineCombinations = function(column) {
      var c, combination, combinations, _i, _len;
      combinations = [[0, 1, 2, 3], [1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
      c = [];
      for (_i = 0, _len = combinations.length; _i < _len; _i++) {
        combination = combinations[_i];
        if (combination.indexOf(column) > -1) c.push(combination);
      }
      return c;
    };

    Game.prototype.isLineWinningMove = function(line, column, number) {
      var combination, num, winned, _i, _j, _len, _len2, _ref;
      _ref = this.lineCombinations(column);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        combination = _ref[_i];
        winned = true;
        for (_j = 0, _len2 = combination.length; _j < _len2; _j++) {
          num = combination[_j];
          if (this.matrix[line][num] !== number) winned = false;
        }
        if (winned) return winned;
      }
      return false;
    };

    Game.prototype.columnCombinations = function(line) {
      var c, combination, combinations, _i, _len;
      combinations = [[0, 1, 2, 3], [1, 2, 3, 4], [2, 3, 4, 5]];
      c = [];
      for (_i = 0, _len = combinations.length; _i < _len; _i++) {
        combination = combinations[_i];
        if (combination.indexOf(line) > -1) c.push(combination);
      }
      return c;
    };

    Game.prototype.isColumnWinningMove = function(line, column, number) {
      var combination, num, winned, _i, _j, _len, _len2, _ref;
      _ref = this.columnCombinations(line);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        combination = _ref[_i];
        winned = true;
        for (_j = 0, _len2 = combination.length; _j < _len2; _j++) {
          num = combination[_j];
          if (this.matrix[num][column] !== number) winned = false;
        }
        if (winned) return winned;
      }
      return false;
    };

    Game.prototype.isDiagonalWinningMove = function(line, column, number) {
      return false;
    };

    Game.prototype.isWinningMove = function(line, column, number) {
      return this.isColumnWinningMove(line, column, number) || this.isLineWinningMove(line, column, number) || this.isDiagonalWinningMove(line, column, number);
    };

    Game.prototype.start = function() {
      return console.log("starting game from server…");
    };

    Game.prototype.stop = function() {
      var index;
      index = Game.games.indexOf(this);
      return Game.games = Game.games.splice(index, 1);
    };

    Game.prototype.isRunning = function() {
      return this.players.length === 2;
    };

    Game.prototype.isAvailable = function() {
      return this.players.length < 2;
    };

    Game.prototype.isFilled = function(line, column) {
      var node;
      node = this.matrix[line][column];
      return node === 0 || node === 1;
    };

    Game.prototype.playAt = function(line, column, player_num) {
      var data, num, player_1, player_2, _ref;
      player_1 = this.findPlayerByNum(player_num);
      player_2 = this.findPlayerByNum((player_num + 1) % 2);
      for (num = _ref = LINES - 1; _ref <= 0 ? num <= 0 : num >= 0; _ref <= 0 ? num++ : num--) {
        if (!this.isFilled(num, column)) {
          this.matrix[num][column] = player_num;
          data = {
            line: num,
            column: column,
            player: player_num
          };
          player_1.emit("game:played", data);
          player_2.emit("game:played", data);
          this.changePlayer();
          if (this.isWinningMove(num, column, player_num)) {
            player_1.emit("game:win");
            player_2.emit("game:loose");
            this.stop();
          }
          return;
        }
      }
      return player_2.emit("game:box_not_available");
    };

    Game.prototype.play = function(player_num, line, column) {
      var other_num, other_player, player;
      player = this.findPlayerByNum(player_num);
      other_num = (player_num + 1) % 2;
      other_player = this.players[other_num];
      if (this.current_player === player_num) {
        return this.playAt(line, column, player_num);
      } else {
        return player.emit("game:wait");
      }
    };

    return Game;

  })();

  io = require('socket.io').listen(PORT);

  io.sockets.on('connection', function(socket) {
    socket.on('game:start', function(data) {
      var game, player, player_position, _i, _len, _ref, _ref2, _results;
      _ref = Game.findOrCreate(socket), game = _ref[0], player_position = _ref[1];
      if (game) {
        socket.emit('game:registered', {
          number: game.position,
          position: player_position
        });
        if (game.isRunning()) {
          _ref2 = game.players;
          _results = [];
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            player = _ref2[_i];
            _results.push(player.emit('game:started'));
          }
          return _results;
        }
      } else {
        return socket.emit('game:not_registered');
      }
    });
    return socket.on('game:play', function(data) {
      var column, game, line, player;
      game = Game.games[data.game];
      player = data.player;
      line = data.line;
      column = data.column;
      return game.play(player, line, column);
    });
  });

}).call(this);
