// connection to clients
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var Guid = require('guid');

// log4node
function log(message, socket) {
	if(socket) {
		// prepend with socket id
		message = socket.id + ': ' + message;
	}
	
	console.log(message);
}

// default page
app.get('/', function(req, res) {
	//res.send('<h1>Hello world</h1>');
	res.sendFile(__dirname + '/client/index.html');
});

// serve all stuff in client as static files
app.use(express.static('client'));

// the port we will be listening to
http.listen(3000, function() {
	log('listening on *:3000');
});

// user and session management
var sessions = {};
var sessionsByUsername = {};
var player1 = null;
var player2 = null;

function savePlayedHandToHistory(playedHands, key, value) {
	if (playedHands.length === 0 || (playedHands[playedHands.length - 1].myHandName !== '' && playedHands[playedHands.length - 1].otherHandName !== '')) {
		playedHands.push({
			myHandName: '',
			otherHandName: '',
			otherHasChosen: false
		});
	}
	
	playedHands[playedHands.length - 1][key] = value;
}

// socket event handlers
io.on('connection', function(socket) {
	log('a user connected', socket);
	
	socket.on('disconnect', function() {
		log('user disconnected', socket);
	});
	
	socket.on('authenticate', function(username) {
		log('user authenticated: ' + username, socket);
		
		if (sessionsByUsername[username]) {
			log('authentication failed', socket);
			
			// a user with this name already exists, ask for a new name
			socket.emit('authenticateFail');
		} else {
			var sessionId = Guid.create();
			var session = {
				id: sessionId,
				username: username,
				playedHands: []
			};
			sessions[sessionId] = session;
			sessionsByUsername[username] = session;
			
			socket.emit('authenticateSuccess', JSON.stringify(session));
			
			// while we do not have a bracket yet: first player to authenticate is player 1, 2nd is player 2 and the rest are spectators
			if (!player1) {
				player1 = session;
				
				socket.broadcast.emit('playerJoined', username);
			} else if (!player2) {
				player2 = session;
				
				// now we know both players' names
				player2.otherUsername = player1.username;
				player1.otherUsername = player2.username;
				
				// player 2 missed the original broadcast of the "player joined" signal of player 1, so send it again
				socket.emit('playerJoined', player1.username);
				
				socket.broadcast.emit('playerJoined', username);
			}
		}
	});
	
	socket.on('playHand', function(playedHandJson) {
		log('play hand: ' + playedHandJson, socket);
		var playedHand = JSON.parse(playedHandJson);
		
		if (playedHand.username === player1.username && playedHand.otherUsername === player2.username) {
			savePlayedHandToHistory(player1.playedHands, 'myHandName', playedHand.myHandName);
			savePlayedHandToHistory(player2.playedHands, 'otherHandName', playedHand.myHandName);
		} else if (playedHand.username === player2.username && playedHand.otherUsername === player1.username) {
			savePlayedHandToHistory(player2.playedHands, 'myHandName', playedHand.myHandName);
			savePlayedHandToHistory(player1.playedHands, 'otherHandName', playedHand.myHandName);
		}
		
		var player1sHandName = player1.playedHands[player1.playedHands.length - 1].myHandName;
		var player2sHandName = player2.playedHands[player2.playedHands.length - 1].myHandName;
		
		if (player1sHandName && player2sHandName) {
			// both players have played, time to emit the actual hands
			
			playedHandJson = JSON.stringify({
				username: player1.username,
				otherUsername: player1.otherUsername,
				myHandName: player1sHandName
			});
			
			io.emit('playHand', playedHandJson);
			
			playedHandJson = JSON.stringify({
				username: player2.username,
				otherUsername: player2.otherUsername,
				myHandName: player2sHandName
			});
			
			io.emit('playHand', playedHandJson);
		} else {
			if (playedHand.username === player1.username && playedHand.otherUsername === player2.username) {
				savePlayedHandToHistory(player2.playedHands, 'otherHasChosen', true);
			} else if (playedHand.username === player2.username && playedHand.otherUsername === player1.username) {
				savePlayedHandToHistory(player1.playedHands, 'otherHasChosen', true);
			}
			
			socket.broadcast.emit('handChosen', playedHand.username);
		}
	});
});

// exit logic
process.on('SIGINT', function() {
	log('Shutting down after SIGINT.');
	process.exit();
});

process.on('exit', function(code) {
	log('About to exit with code: ' + code);
});