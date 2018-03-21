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
var player1 = null;
var player2 = null;

// socket event handlers
io.on('connection', function(socket) {
	log('a user connected', socket);
	
	socket.on('disconnect', function() {
		log('user disconnected', socket);
		
		var session = sessionsBySocketId[socket.id];
		
		if (session) {
			log('disconnected user found: ' + session.username, socket);
			
			// remove session from all otherUsers arrays
			for (existingUsername in sessionsByUsername) {
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
				socketId: socket.id,
				challengedBy: '',
				playedHands: [],
				otherUsers: [],
				player1Name: player1 && player2 ? player1.username : '',
				player2Name: player1 && player2 ? player2.username : '',
				towels: []
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
	
	socket.on('resumeSession', function(sessionId) {
		log('resume session: ' + sessionId, socket);
		var session = sessions[sessionId];
		
		if (session) {
			session.socketId = socket.id;
			
			// re-add this user to the existing sessions
			for (existingUsername in sessionsByUsername) {
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
	
	socket.on('towelsChosen', function(towelsJson) {
		log('towelsChosen: ' + towelsJson, socket);
		var towels = JSON.parse(towelsJson);
		var session = sessionsBySocketId[socket.id];
		session.towels = towels;
	});
	
	socket.on('playHand', function(playedHandJson) {
		log('play hand: ' + playedHandJson, socket);
		var playedHand = JSON.parse(playedHandJson);
		
		if (playedHand.username === player1.username && playedHand.otherUsername === player2.username) {
			logic.savePlayedHandToHistory(player1.playedHands, 'myHandName', playedHand.myHandName);
			logic.savePlayedHandToHistory(player1.playedHands, 'myTowel', playedHand.myTowel);
			logic.savePlayedHandToHistory(player1.playedHands, 'myTowelTarget', playedHand.myTowelTarget);
			logic.savePlayedHandToHistory(player2.playedHands, 'otherHasChosen', true);
		} else if (playedHand.username === player2.username && playedHand.otherUsername === player1.username) {
			logic.savePlayedHandToHistory(player2.playedHands, 'myHandName', playedHand.myHandName);
			logic.savePlayedHandToHistory(player2.playedHands, 'myTowel', playedHand.myTowel);
			logic.savePlayedHandToHistory(player2.playedHands, 'myTowelTarget', playedHand.myTowelTarget);
			logic.savePlayedHandToHistory(player1.playedHands, 'otherHasChosen', true);
		}
		
		var player1sHand = player1.playedHands[player1.playedHands.length - 1];
		var player2sHand = player2.playedHands[player2.playedHands.length - 1];
		
		if (player1sHand.myHandName && player2sHand.myHandName) {
			// both players have played, time to emit the actual hands and store them in the sessions
			
			logic.savePlayedHandToHistory(player1.playedHands, 'otherHandName', player2sHand.myHandName);
			logic.savePlayedHandToHistory(player1.playedHands, 'otherTowel', player2sHand.myTowel);
			logic.savePlayedHandToHistory(player1.playedHands, 'otherTowelTarget', player2sHand.myTowelTarget);
			
			logic.savePlayedHandToHistory(player2.playedHands, 'otherHandName', player1sHand.myHandName);
			logic.savePlayedHandToHistory(player2.playedHands, 'otherTowel', player1sHand.myTowel);
			logic.savePlayedHandToHistory(player2.playedHands, 'otherTowelTarget', player1sHand.myTowelTarget);
			
			playedHandJson = JSON.stringify({
				username: player1.username,
				otherUsername: player2.username,
				myHandName: player1sHand.myHandName,
				myTowel: player1sHand.myTowel,
				myTowelTarget: player1sHand.myTowelTarget
			});
			
			io.emit('playHand', playedHandJson);
			
			playedHandJson = JSON.stringify({
				username: player2.username,
				otherUsername: player1.username,
				myHandName: player2sHand.myHandName,
				myTowel: player2sHand.myTowel,
				myTowelTarget: player2sHand.myTowelTarget
			});
			
			io.emit('playHand', playedHandJson);
		} else {
			socket.broadcast.emit('handChosen', playedHand.username);
		}
	});
	
	socket.on('endGame', function() {
		log('endGame', socket);
		
		// clear both players' sessions
		logic.clearSession(sessions[player1.id]);
		logic.clearSession(sessions[player2.id]);
		
		// clear player 1 and 2
		player1 = null;
		player2 = null;
		
		// let everyone else know
		socket.broadcast.emit('gameEnded');
	});
	
	socket.on('challengeUser', function(username) {
		log('user challenged: ' + username, socket);
		
		var session = sessionsBySocketId[socket.id];
		var otherSession = sessionsByUsername[username];
		
		if (session && otherSession) {
			// save challenge in other user's session
			otherSession.challengedBy = session.username;
			
			// emit challenge to other user
			socket.to(otherSession.socketId).emit('challengedByUser', session.username);
		} else {
			// emit error?
		}
	});
	
	socket.on('challengeAccepted', function(username) {
		log('challenge accepted: ' + username, socket);
		
		var session = sessionsBySocketId[socket.id];
		var otherSession = sessionsByUsername[username];
		
		if (session && otherSession) {
			// the original challenger is player 1
			player1 = otherSession;
			
			// the accepter is player 2
			player2 = session;
			
			// start the game!
			log('game started: ' + player1.username + ' vs ' + player2.username, socket);
			
			for (existingUsername in sessionsByUsername) {
				// clear any previously played hands
				sessionsByUsername[existingUsername].playedHands.splice(0);
				
				// we know both players' names now, everyone should know this, so store it in their sessions
				logic.savePlayerNamesToSession(sessionsByUsername[existingUsername], player1.username, player2.username)
			}
			
			// and send it to everyone
			io.emit('gameStarted', JSON.stringify({
				player1Name: player1.username,
				player2Name: player2.username
			}));
		} else {
			// emit error?
		}
	});
	
	socket.on('challengeRejected', function(username) {
		log('challenge rejected: ' + username, socket);
		
		var session = sessionsBySocketId[socket.id];
		var otherSession = sessionsByUsername[username];
		
		if (session && otherSession) {
			// remove challenge in current user's session
			session.challengedBy = '';
			
			// emit rejection to other user
			socket.to(otherSession.socketId).emit('challengeRejected', username);
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