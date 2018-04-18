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
var sessionsBySocketId = {};
var game = {};

// socket event handlers
io.on('connection', function(socket) {
	log('a user connected', socket);
	
	socket.on('disconnect', function() {
		log('user disconnected', socket);
		
		var session = sessionsBySocketId[socket.id];
		
		if (session) {
			log('disconnected user found: ' + session.username, socket);
			
			// remove session from all otherUsers arrays
			for (var existingUsername in sessionsByUsername) {
				logic.removeFromOtherUsers(sessionsByUsername[existingUsername].otherUsers, session.username);
			}
			
			// also remove this session from the indexes so it can be used again (except for sessionId, as that can be used for resuming)
			delete sessionsByUsername[session.username];
			delete sessionsBySocketId[session.socketId];
			
			// and emit disconnect to others
			socket.broadcast.emit('playerDisconnected', session.username);
		}
	});
	
	socket.on('authenticate', function(username) {
		if (username) {
			username = username.trim();
		}
		
		log('user authentication attempted: ' + username, socket);
		
		if (!logic.validateUsername(username)) {
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
				socketId: socket.id,
				challengedBy: '',
				otherUsers: [],
				gameId: ''
			};
			
			for (var existingUsername in sessionsByUsername) {
				// put existing users in new session
				session.otherUsers.push({
					name: existingUsername
				});
				
				// and add this new user to the existing sessions
				sessionsByUsername[existingUsername].otherUsers.push({
					name: username
				});
			}
			
			// store in our 3 indexes (for fast lookup)
			sessions[sessionId] = session;
			sessionsByUsername[username] = session;
			sessionsBySocketId[socket.id] = session;
			
			// send success to the authenticating client
			socket.emit('authenticateSuccess', JSON.stringify(session));
			
			// and announce the join to the others
			socket.broadcast.emit('playerJoined', username);
		}
	});
	
	// TODO: re-add other users to this session and refactor to logic as this is the 2nd usage of the same code (see authenticate: 100)
	socket.on('resumeSession', function(sessionId) {
		log('resume session: ' + sessionId, socket);
		var session = sessions[sessionId];
		
		if (session) {
			session.socketId = socket.id;
			
			// re-add this user to the existing sessions
			for (var existingUsername in sessionsByUsername) {
				sessionsByUsername[existingUsername].otherUsers.push({
					name: session.username
				});
			}
			
			// ensure the session is present in all indexes
			sessionsBySocketId[socket.id] = session;
			sessionsByUsername[session.username] = session;
			
			// update the client with the last known session state
			socket.emit('resumeSession', JSON.stringify(session));
			
			// and announce the re-join to the others
			socket.broadcast.emit('playerJoined', session.username);
		} else {
			socket.emit('authenticateFail', 'Your session could not be found. Choose a name to start a new session.');
		}
	});
	
	socket.on('towelsChosen', function(chosenTowelsJson) {
		log('towelsChosen: ' + chosenTowelsJson, socket);
		
		var chosenTowels = JSON.parse(chosenTowelsJson);
		var game = games[chosenTowels.gameId];
		var mySession = sessionsBySocketId[socket.id];
		var whoPlayed = game.player1.username === mySession.username ? 'player1' : 'player2';
		
		game[whoPlayed].towels = chosenTowels.towels;
	});
	
	socket.on('playHand', function(playedHandJson) {
		log('play hand: ' + playedHandJson, socket);
		var playedHand = JSON.parse(playedHandJson);
		var game = games[playedHand.gameId];
		var mySession = sessionsBySocketId[socket.id];
		var whoPlayed = game.player1.username === mySession.username ? 'player1' : 'player2';
		var otherPlayer = whoPlayed === 'player1' ? 'player2' : 'player1';
		
		logic.savePlayedHandToHistory(game[whoPlayed].playedHands, 'myHandName', playedHand.myHandName);
		logic.savePlayedHandToHistory(game[whoPlayed].playedHands, 'myTowel', playedHand.myTowel);
		logic.savePlayedHandToHistory(game[whoPlayed].playedHands, 'myTowelTarget', playedHand.myTowelTarget);
		logic.savePlayedHandToHistory(game[otherPlayer].playedHands, 'otherHasChosen', true);
		
		var player1sHand = game.player1.playedHands[game.player1.playedHands.length - 1];
		var player2sHand = game.player2.playedHands[game.player2.playedHands.length - 1];
		
		if (player1sHand.myHandName && player2sHand.myHandName) {
			// both players have played, time to emit the actual hands and store them in the games
			
			logic.savePlayedHandToHistory(game.player1.playedHands, 'otherTowel', player2sHand.myTowel);
			logic.savePlayedHandToHistory(game.player1.playedHands, 'otherTowelTarget', player2sHand.myTowelTarget);
			logic.savePlayedHandToHistory(game.player1.playedHands, 'otherHandName', player2sHand.myHandName);
			
			logic.savePlayedHandToHistory(game.player2.playedHands, 'otherTowel', player1sHand.myTowel);
			logic.savePlayedHandToHistory(game.player2.playedHands, 'otherTowelTarget', player1sHand.myTowelTarget);
			logic.savePlayedHandToHistory(game.player2.playedHands, 'otherHandName', player1sHand.myHandName);
			
			playedHandJson = JSON.stringify({
				gameId: game.id,
				username: game.player1.username,
				myHandName: player1sHand.myHandName,
				myTowel: player1sHand.myTowel,
				myTowelTarget: player1sHand.myTowelTarget
			});
			
			io.emit('playHand', playedHandJson);
			
			playedHandJson = JSON.stringify({
				gameId: game.id,
				username: game.player2.username,
				myHandName: player2sHand.myHandName,
				myTowel: player2sHand.myTowel,
				myTowelTarget: player2sHand.myTowelTarget
			});
			
			io.emit('playHand', playedHandJson);
		} else {
			socket.broadcast.emit('handChosen', mySession.username);
		}
	});
	
	socket.on('surrender', function(gameId) {
		log('surrender', socket);
		var session = sessionsBySocketId[socket.id];
		var game = games[gameId];
		
		game.surrendered = session.username;
		
		// let everyone else know
		socket.broadcast.emit('surrender', session.username);
	});
	
	socket.on('endGame', function(gameId) {
		log('endGame', socket);
		
		delete games[gameId];
		
		// let everyone else know
		socket.broadcast.emit('gameEnded', gameId);
	});
	
	socket.on('challengeUser', function(username) {
		log('user challenged: ' + username, socket);
		
		var session = sessionsBySocketId[socket.id];
		var otherSession = sessionsByUsername[username];
		
		// save challenge in other user's session
		otherSession.challengedBy = session.username;
		
		// emit challenge to other user
		socket.to(otherSession.socketId).emit('challengedByUser', session.username);
	});
	
	socket.on('challengeAccepted', function(username) {
		log('challenge accepted: ' + username, socket);
		
		var session = sessionsBySocketId[socket.id];
		var otherSession = sessionsByUsername[username];
		
		// remove challenge in current user's session
		session.challengedBy = '';
		
		// the original challenger is player 1
		var player1sName = otherSession.username;
		
		// the accepter is player 2
		var player2sName = session.username;
		
		// start the game!
		log('game started: ' + player1sName + ' vs ' + player2sName, socket);
		
		// create the game
		var gameId = Guid.create();
		var game = {
			id: gameId,
			surrendered: '',
			player1: {
				username: player1sName,
				towels: [],
				playedHands: []
			},
			player2: {
				username: player2sName,
				towels: [],
				playedHands: []
			}
		};
		
		// store it
		games[gameId] = game;
		
		// also switch both player's focus to their game
		session.gameId = gameId;
		otherSession.gameId = gameId;
		
		// finally, send it to everyone
		io.emit('gameStarted', JSON.stringify(game);
	});
	
	socket.on('challengeRejected', function(username) {
		log('challenge rejected: ' + username, socket);
		
		var session = sessionsBySocketId[socket.id];
		var otherSession = sessionsByUsername[username];
		
		// remove challenge in current user's session
		session.challengedBy = '';
		
		// emit rejection to other user
		socket.to(otherSession.socketId).emit('challengeRejected', username);
	});
	
	socket.on('chatMessage', function(chatMessage) {
		log('chatMessage: ' + chatMessage, socket);
		io.emit('chatMessage', chatMessage);
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