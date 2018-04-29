// connection to clients
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// guids for sessions
var Guid = require('guid');

// the business logic shared between clients and server
var logic = require('./shared/logic.js');
var tournamentLogic = require('./shared/tournamentLogic.js');

// log4node
function log(message, socket) {
	if(socket) {
		// prepend with socket id
		message = socket.id + ': ' + message;
	}
	
	console.log(message);
}

// returns a clone of the session with games and tournaments added, the original session remains unharmed
function addListsToSession(session) {
	var clonedSession = logic.clone(session);
	clonedSession.games = games;
	clonedSession.tournaments = tournaments;
	
	return clonedSession;
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
var games = {};
var tournaments = {};

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
			
			// add the games and tournaments, but to a cloned session so the original is not polluted
			var clonedSession = addListsToSession(session);
			
			// send success to the authenticating client with details of the session and games and tournaments
			socket.emit('authenticateSuccess', JSON.stringify(clonedSession));
			
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
			
			// add the games and tournaments, but to a cloned session so the original is not polluted
			var clonedSession = addListsToSession(session);
			
			// update the client with the last known session state and games and tournaments
			socket.emit('resumeSession', JSON.stringify(clonedSession));
			
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
		
		// reset gameId in both players' sessions
		var game = games[gameId];
		var session = sessionsBySocketId[socket.id];
		var otherPlayername = game.player1.username === session.username ? game.player2.username : game.player1.username;
		var otherSession = sessionsByUsername[otherPlayername];
		session.gameId = '';
		otherSession.gameId = '';
		
		// remove from the list of games
		delete games[gameId];
		
		// let everyone else know
		socket.broadcast.emit('gameEnded', gameId);
		
		// move winner and maybe also loser along in the bracket of the tournament, unless the ended game is the finals
		/*for (tournamentId in tournaments) {
			var tournament = tournaments[tournamentId];
			var match = tournamentLogic.findMatchByActualPlayerNames(tournament.bracket, session.username, otherSession.username);
			
			if (match) {
				// TODO: determine winner
				var winner = '';
				var newMatch = tournamentLogic.moveAlongBracket(tournament.bracket, match, winner);
				
				// TODO: start new match
				if (newMatch) {
					
				}
			}
		}*/
	});
	
	socket.on('createTournament', function(name) {
		log('createTournament', socket);
		
		var session = sessionsBySocketId[socket.id];
		
		// create new tournament, with the current user as its admin and currently only player (admin is only one who can start and end tournament)
		var tournamentId = Guid.create();
		var tournament = {
			id: tournamentId,
			name: name,
			admin: session.username,
			players: [session.username],
			started: false,
			bracket: []
		};
		
		// add to the indexed list of tournaments
		tournaments[tournamentId] = tournament;
		
		// let everyone else know
		socket.broadcast.emit('tournamentCreated', tournament);
	});
	
	socket.on('joinTournament', function(tournamentId) {
		log('joinTournament: ' + tournamentId, socket);
		
		// add player to tournament
		var session = sessionsBySocketId[socket.id];
		var tournament = tournaments[tournamentId];
		tournament.players.push(session.username);
		
		// let everyone else know
		socket.broadcast.emit('joinedTournament', JSON.stringify({ tournamentId: tournamentId, username: session.username }));
	});
	
	socket.on('startTournament', function(tournamentId) {
		log('startTournament: ' + tournamentId, socket);
		
		// flip the started bit, so noone can join anymore
		var tournament = tournaments[tournamentId];
		tournament.started = true;
		
		// let everyone else know (so noone can join anymore)
		socket.broadcast.emit('tournamentStarted', tournamentId);
		
		// create and emit the bracket
		tournament.bracket = tournamentLogic.generateBracket(tournament.players.length);
		io.emit('tournamentStarted', tournament);
		
		// start the first games of the bracket
		var firstMatches = tournamentLogic.getStartingMatches(tournament.bracket);
		firstMatches.forEach(match => {
			var session = sessionsByUsername[tournament.players[match.players[0] - 1]];
			var otherSession = sessionsByUsername[tournament.players[match.players[1] - 1]];
			match.actualPlayers.push(session.username);
			match.actualPlayers.push(otherSession.username);
			startGame(session, otherSession);
		});
	});
	
	socket.on('endTournament', function(tournamentId) {
		log('endTournament: ' + tournamentId, socket);
		
		delete tournaments[tournamentId];
		
		// let everyone else know
		socket.broadcast.emit('tournamentEnded', tournamentId);
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
		
		// start the game!
		// the original challenger is player 1
		// the accepter is player 2
		startGame(session, otherSession, true);
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
	
	// shared code for starting a game and broadcasting that
	function startGame(session, otherSession, player1IsOther) {
		var player1sName = player1IsOther ? otherSession.username : session.username;
		var player2sName = player1IsOther ? session.username : otherSession.username;
		
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
		io.emit('gameStarted', JSON.stringify(game));
	}
});

// exit logic
process.on('SIGINT', function() {
	log('Shutting down after SIGINT.');
	process.exit();
});

process.on('exit', function(code) {
	log('About to exit with code: ' + code);
});