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
var player1 = false;
var player2 = false;

// socket event handlers
io.on('connection', function(socket) {
	log('a user connected', socket);
	
	socket.on('disconnect', function() {
		log('user disconnected', socket);
	});
	
	socket.on('authenticate', function(username) {
		log('user authenticated: ' + username, socket);
		var session = sessionsByUsername[username];
		
		if (session) {
			log('authentication failed', socket);
			socket.emit('authenticateFail');
		} else {
			var sessionId = Guid.create();
			var session = {
				id: sessionId,
				username: username
			};
			sessions[sessionId] = session;
			sessionsByUsername[username] = session;
			
			socket.emit('authenticateSuccess', JSON.stringify(session));
			
			if (!player1) {
				player1 = session;
			} else if (!player2) {
				player2 = session;
				socket.emit('playerJoined', player1.username);
				socket.broadcast.emit('playerJoined', username);
			}
		}
	});
	
	socket.on('playHand', function(playedHandJson) {
		log('play hand: ' + playedHandJson, socket);
		socket.broadcast.emit('playHand', playedHandJson);
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