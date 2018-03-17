// connection to clients
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// guids for sessions
var Guid = require('guid');

// the business logic shared between clients and server
var logic = require('./shared/logic.js');

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

// serve all stuff in client and shared as static files
app.use(express.static('client'));
app.use('/shared', express.static('shared'));

// the port we will be listening to
http.listen(3000, function() {
	log('listening on *:3000');
});

// user and session management
var sessions = {};
var sessionsByUsername = {};
var player1 = null;
var player2 = null;

// socket event handlers
io.on('connection', function(socket) {
	log('a user connected', socket);
	
	socket.on('disconnect', function() {
		log('user disconnected', socket);
	});
	
	socket.on('authenticate', function(username) {
		log('user authentication attempted: ' + username, socket);
		
		if (!username || username.match(/^\s*$/) !== null) {
			log('authentication failed: invalid name: ' + username, socket);
			
			// invalid name, ask for a new name
			socket.emit('authenticateFail', 'That name is not valid. Choose a different name.');
		} else if (sessionsByUsername[username]) {
			log('authentication failed: already in use', socket);
			
			// a user with this name already exists, ask for a new name
			socket.emit('authenticateFail', 'That name is already used by someone else. Choose a different name.');
		} else {
			log('authentication succeeded', socket);
			
			// build a new session
			var sessionId = Guid.create();
			var session = {
				id: sessionId,
				username: username,
				playedHands: [],
				otherUsers: [],
				player1Name: player1 && player2 ? player1.username : '',
				player2Name: player1 && player2 ? player2.username : ''
			};
			
			for (existingUsername in sessionsByUsername) {
				// put existing users in new session
				session.otherUsers.push({
					name: existingUsername
				});
				
				// and add this new user to the existing sessions
				sessionsByUsername[existingUsername].otherUsers.push({
					name: username
				});
			}
			
			sessions[sessionId] = session;
			sessionsByUsername[username] = session;
			
			// send success to the authenticating client
			socket.emit('authenticateSuccess', JSON.stringify(session));
			
			// and announce the join to the others
			socket.broadcast.emit('playerJoined', username);
			
			// while we do not have a bracket yet: first player to authenticate is player 1, 2nd is player 2 and the rest are spectators
			if (!player1) {
				player1 = session;
			} else if (!player2) {
				player2 = session;
				
				// now we know both players' names, everyone should know this
				log('game started: ' + player1.username + ' vs ' + player2.username, socket);
				
				for (existingUsername in sessionsByUsername) {
					logic.savePlayerNamesToSession(sessionsByUsername[existingUsername], player1.username, player2.username)
				}
				
				io.emit('gameStarted', JSON.stringify({
					player1Name: player1.username,
					player2Name: player2.username
				}));
			}
		}
	});
	
	socket.on('resumeSession', function(sessionId) {
		log('resume session: ' + sessionId, socket);
		var session = sessions[sessionId];
		
		if (session) {
			socket.emit('resumeSession', JSON.stringify(session));
		} else {
			socket.emit('authenticateFail', 'Your session could not be found. Choose a name to start a new session.');
		}
	});
	
	socket.on('playHand', function(playedHandJson) {
		log('play hand: ' + playedHandJson, socket);
		var playedHand = JSON.parse(playedHandJson);
		
		if (playedHand.username === player1.username && playedHand.otherUsername === player2.username) {
			logic.savePlayedHandToHistory(player1.playedHands, 'myHandName', playedHand.myHandName);
			logic.savePlayedHandToHistory(player2.playedHands, 'otherHasChosen', true);
		} else if (playedHand.username === player2.username && playedHand.otherUsername === player1.username) {
			logic.savePlayedHandToHistory(player2.playedHands, 'myHandName', playedHand.myHandName);
			logic.savePlayedHandToHistory(player1.playedHands, 'otherHasChosen', true);
		}
		
		var player1sHandName = player1.playedHands[player1.playedHands.length - 1].myHandName;
		var player2sHandName = player2.playedHands[player2.playedHands.length - 1].myHandName;
		
		if (player1sHandName && player2sHandName) {
			// both players have played, time to emit the actual hands and store them in the sessions
			
			logic.savePlayedHandToHistory(player1.playedHands, 'otherHandName', player2sHandName);
			logic.savePlayedHandToHistory(player2.playedHands, 'otherHandName', player1sHandName);
			
			playedHandJson = JSON.stringify({
				username: player1.username,
				otherUsername: player2.username,
				myHandName: player1sHandName
			});
			
			io.emit('playHand', playedHandJson);
			
			playedHandJson = JSON.stringify({
				username: player2.username,
				otherUsername: player1.username,
				myHandName: player2sHandName
			});
			
			io.emit('playHand', playedHandJson);
		} else {
			if (playedHand.username === player1.username && playedHand.otherUsername === player2.username) {
				logic.savePlayedHandToHistory(player2.playedHands, 'otherHasChosen', true);
			} else if (playedHand.username === player2.username && playedHand.otherUsername === player1.username) {
				logic.savePlayedHandToHistory(player1.playedHands, 'otherHasChosen', true);
			}
			
			socket.broadcast.emit('handChosen', playedHand.username);
		}
	});
	
	socket.on('newGame', function(username) {
		var session = sessionsByUsername[username];
		
		if (session) {
			session.playedHands.splice(0);
		} else {
			// emit error?
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