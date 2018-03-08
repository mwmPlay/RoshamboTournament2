// clone any object, severing all references within
function clone(object) {
	return JSON.parse(JSON.stringify(object));
}

function log(message, socket) {
	if(socket) {
		// prepend with socket id
		message = socket.id + ': ' + message;
	}
	
	console.log(message);
}

(function() {
	// init socket
	var socket = io();
	
	var app = new Vue({
		el: '#app',
		data: {
			hands : [
				{
					name: 'rock',
					result: {
						paper: {
							text: 'is covered by',
							win: false
						},
						scissors: {
							text: 'crushes',
							win: true
						}
					}
				},
				{
					name: 'paper',
					result: {
						rock: {
							text: 'covers',
							win: true
						},
						scissors: {
							text: 'is cut by',
							win: false
						}
					}
				},
				{
					name: 'scissors',
					result: {
						rock: {
							text: 'is crushed by',
							win: false
						},
						paper: {
							text: 'cut',
							win: true
						}
					}
				}
			],
			myHand: '',
			otherHand: '',
			handResult: '',
			myScore: 0,
			otherScore: 0,
			maxScore: 3,
			username: '',
			otherUsername: ''
		},
		methods: {
			playHand: function(hand) {
				log('hand played by me: ' + hand, socket);
				this.myHand = hand;
				
				var playedHandJson = JSON.stringify({
					username: this.username,
					otherUsername: this.otherUsername,
					hand: hand
				})
				
				socket.emit('playHand', playedHandJson);
				
				this.tryToDetermineWinner();
			},
			tryToDetermineWinner: function() {
				if (this.myHand && this.otherHand) {
					var resultVerb;
					var resultText;
					
					if (this.myHand === this.otherHand) {
						resultVerb = 'draw';
						resultText = 'is the same as';
					} else {
						var myHand = this.myHand;
						var hand = this.hands.find(function(elem) {
							return elem.name === myHand;
						});
						
						var otherHandResult = hand.result[this.otherHand];
						
						if (otherHandResult.win) {
							resultVerb = 'win';
							this.myScore++;
						} else {
							resultVerb = 'lose';
							this.otherScore++;
						}
						
						resultText = otherHandResult.text;
					}
					
					this.handResult = this.myHand + ' ' + resultText + ' ' + this.otherHand + '. You ' + resultVerb + '!';
				}
			},
			nextRound: function() {
				this.myHand = '';
				this.otherHand = '';
				this.handResult = '';
			}
		}
	});
	
	socket.on('playHand', function(playedHandJson) {
		log('hand was played by other: ' + playedHandJson, socket);
		var playedHand = JSON.parse(playedHandJson);
		
		if (playedHand.username === app.otherUsername && playedHand.otherUsername === app.username) {
			app.otherHand = playedHand.hand;
			app.tryToDetermineWinner();
		}
	});
	
	socket.on('resumeSession', function(sessionJson) {
		log('resuming session: ' + sessionJson, socket);
		var session = JSON.parse(sessionJson);
		app.username = session.username;
		app.otherUsername = session.otherUsername;
		app.myHand = session.myHand;
		app.otherHand = session.otherHand;
		
		// todo: use another way (computed property) to determine realtime
		app.handResult = session.handResult;
		
		app.myScore = session.myScore;
		app.otherScore = session.otherScore;
	});
	
	socket.on('authenticateSuccess', function(sessionJson) {
		log('successfully authenticated: ' + sessionJson, socket);
		var session = JSON.parse(sessionJson);
		document.cookie = 'sessionId=' + session.id;
		app.username = session.username;
	});
	
	socket.on('playerJoined', function(otherUsername) {
		log('player has joined: ' + otherUsername, socket);
		
		if (app.otherUsername === '') {
			app.otherUsername = otherUsername;
		}
	});
	
	socket.on('authenticateFail', function() {
		var username = prompt('That name is already used by someone else. Choose a different name.');
		socket.emit('authenticate', username);
	});
	
	if (document.cookie === '') {
		var username = prompt('Who are you?');
		socket.emit('authenticate', username);
	} else {
		var sessionId = document.cookie.substring(10);
		socket.emit('resumeSession', sessionId);
	}
})();