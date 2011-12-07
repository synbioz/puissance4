(function() {
  var PORT, addMessage, clean, cleanGrid, cleanMessages, cleanYouAndCurrent, finish, game, getBoardPosition, initialize, initializeBoard, playAt, running, setCurrentPlayer, setMyColor, socket;

  PORT = 8000;

  socket = game = running = null;

  addMessage = function(content) {
    var node;
    node = new Element("li").update(content);
    return $('messages').insert({
      top: node
    });
  };

  setMyColor = function(position) {
    return $('iam').addClassName("player_" + position);
  };

  setCurrentPlayer = function(position) {
    return $('who_plays').className = "player_" + position;
  };

  cleanGrid = function() {
    var board;
    board = $('puissance4');
    return board.down().childElements().each(function(line) {
      return line.childElements().each(function(column) {
        return column.className = "";
      });
    });
  };

  cleanYouAndCurrent = function() {
    $('iam').className = "";
    return $('who_plays').className = "player_0";
  };

  cleanMessages = function() {
    $("messages").childElements().each(function(node) {
      return node.remove();
    });
    return addMessage("Waiting for you");
  };

  clean = function() {
    cleanGrid();
    cleanYouAndCurrent();
    return cleanMessages();
  };

  finish = function() {
    game = running = null;
    return $('start').enable();
  };

  initialize = function() {
    var start_button;
    socket = io.connect("http://localhost:" + PORT);
    start_button = $('start');
    start_button.observe('click', function(event) {
      clean();
      socket.emit('game:start');
      socket.on('game:registered', function(data) {
        addMessage("You're registered.");
        game = [data.number, data.position];
        return setMyColor(data.position);
      });
      socket.on('game:not_registered', function() {
        return addMessage("No game available.");
      });
      return socket.on('game:started', function() {
        start_button.disable();
        running = true;
        return addMessage("Let's go.");
      });
    });
    return initializeBoard();
  };

  getBoardPosition = function(board, node) {
    var col_number, cols, line, line_number;
    if (typeof lines === "undefined" || lines === null) {
      lines = board.down().childElements();
    }
    line = node.up("tr");
    cols = line.childElements();
    line_number = lines.indexOf(line);
    col_number = line.childElements().indexOf(node);
    return [line_number, col_number];
  };

  playAt = function(board, player, line, column) {
    var c, l;
    l = board.down().childElements()[line];
    c = l.childElements()[column];
    return c.addClassName("player_" + player);
  };

  initializeBoard = function() {
    var board;
    board = $('puissance4');
    board.observe('click', function(event) {
      var col, line, _ref;
      _ref = getBoardPosition(board, event.target), line = _ref[0], col = _ref[1];
      if (game) {
        if (running) {
          return socket.emit("game:play", {
            line: line,
            column: col,
            game: game[0],
            player: game[1]
          });
        } else {
          return addMessage("Wait for an other player.");
        }
      } else {
        return addMessage("Please start a game.");
      }
    });
    socket.on("game:played", function(data) {
      return playAt(board, data.player, data.line, data.column);
    });
    socket.on("game:wait", function() {
      return addMessage("Wait, not your turn.");
    });
    socket.on("game:box_not_available", function() {
      return addMessage("Can't play here, try again.");
    });
    socket.on("game:win", function() {
      addMessage("You won.");
      return finish();
    });
    socket.on("game:loose", function() {
      addMessage("You lost.");
      return finish();
    });
    return socket.on("game:set_current_player", function(data) {
      return setCurrentPlayer(data.player);
    });
  };

  document.observe("dom:loaded", initialize);

}).call(this);
