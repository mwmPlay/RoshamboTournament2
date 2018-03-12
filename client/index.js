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
						},
						lizard: {
							text: 'crushes',
							win: true
						},
						spock: {
							text: 'is vaporized by',
							win: false
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
						},
						lizard: {
							text: 'is eaten by',
							win: false
						},
						spock: {
							text: 'disproves',
							win: true
						}
					}
				},
				{
					name: 'scissors',
					result: {
						rock: {
							text: 'are crushed by',
							win: false
						},
						paper: {
							text: 'cut',
							win: true
						},
						lizard: {
							text: 'decapitate',
							win: true
						},
						spock: {
							text: 'are smashed by',
							win: false
						}
					}
				},
				{
					name: 'lizard',
					result: {
						rock: {
							text: 'is crushed by',
							win: false
						},
						paper: {
							text: 'eats',
							win: true
						},
						scissors: {
							text: 'is decapitated by',
							win: false
						},
						spock: {
							text: 'poisons',
							win: true
						}
					}
				},
				{
					name: 'spock',
					result: {
						rock: {
							text: 'vaporizes',
							win: true
						},
						paper: {
							text: 'is disproved by',
							win: false
						},
						scissors: {
							text: 'smashes',
							win: true
						},
						lizard: {
							text: 'is poisoned by',
							win: false
						}
					}
				}
			],
			playedHands: [],
			maxScore: 3,
			username: '',
			otherUsername: ''
		},
		computed: {
			myHandName: function () {
				return this.playedHands.length > 0 ? this.playedHands[this.playedHands.length - 1].myHandName : '';
			},
			otherHandName: function () {
				return this.playedHands.length > 0 ? this.playedHands[this.playedHands.length - 1].otherHandName : '';
			},
			otherHasChosen: function () {
				return this.playedHands.length > 0 ? this.playedHands[this.playedHands.length - 1].otherHasChosen : false;
			},
			myScore: function () {
				return this.calculateTotalScore(true);
			},
			otherScore: function () {
				return this.calculateTotalScore(false);
			}
		},
		methods: {
			handButtonTooltip: function (hand) {
				var tooltip = '';
				
				for (var otherHandName in hand.result) {
					tooltip += this.handResult(hand.name, otherHandName) + '\n';
				}
				
				return tooltip;
			},
			handResult: function (myHandName, otherHandName) {
				if (myHandName && otherHandName) {
					var resultText;
					var resultVerb;
					
					if (myHandName === otherHandName) {
						var isPlural = myHandName.slice(-1) === 's';
						
						resultText = (isPlural ? 'are' : 'is') + ' the same as';
						resultVerb = 'draw' + (isPlural ? '' : 's');
					} else {
						var hand = this.hands.find(function(elem) {
							return elem.name === myHandName;
						});
						var result = hand.result[otherHandName];
						resultText = result.text;
						resultVerb = (result.win ? 'win' : 'lose') + (myHandName.slice(-1) === 's' ? '' : 's');
					}
					
					return myHandName + ' ' + resultText + ' ' + otherHandName + ' and ' + resultVerb;
				} else {
					return '';
				}
			},
			playHand: function(myHandName) {
				log('hand played by me: ' + myHandName, socket);
				
				this.savePlayedHandToHistory('myHandName', myHandName);
				
				var playedHandJson = JSON.stringify({
					username: this.username,
					otherUsername: this.otherUsername,
					myHandName: myHandName
				});
				
				socket.emit('playHand', playedHandJson);
			},
			savePlayedHandToHistory: function (key, value) {
				if (this.playedHands.length === 0 || (this.playedHands[this.playedHands.length - 1].myHandName !== '' && this.playedHands[this.playedHands.length - 1].otherHandName !== '')) {
					this.playedHands.push({
						myHandName: '',
						otherHandName: '',
						otherHasChosen: false
					});
				}
				
				this.playedHands[this.playedHands.length - 1][key] = value;
			},
			calculateTotalScore: function (won) {
				var result = 0;
				
				this.playedHands.forEach(function (playedHand) {
					if (playedHand.myHandName !== '' && playedHand.otherHandName !== '' && playedHand.myHandName !== playedHand.otherHandName) {
						var myHand = app.hands.find(function(elem) {
							return elem.name === playedHand.myHandName;
						});
						var handResult = myHand.result[playedHand.otherHandName];
						
						result += won === handResult.win ? 1 : 0;
					}
				});
				
				return result;
			},
			nextRound: function() {
				// add a dummy hand
				this.savePlayedHandToHistory('myHandName', '');
			}
		}
	});
	
	socket.on('handChosen', function(otherUsername) {
		log('hand was chosen, but not yet played by other: ' + otherUsername, socket);
		app.savePlayedHandToHistory('otherHasChosen', true);
	});
	
	socket.on('playHand', function(playedHandJson) {
		log('hand was played by other: ' + playedHandJson, socket);
		var playedHand = JSON.parse(playedHandJson);
		
		if (playedHand.username === app.otherUsername && playedHand.otherUsername === app.username) {
			app.savePlayedHandToHistory('otherHandName', playedHand.myHandName);
		}
	});
	
	socket.on('resumeSession', function(sessionJson) {
		log('resuming session: ' + sessionJson, socket);
		var session = JSON.parse(sessionJson);
		app.username = session.username;
		app.otherUsername = session.otherUsername;
		
		session.playedHands.forEach(function(playedHand) {
			app.playedHands.push(playedHand);
		});
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
	
	socket.on('authenticateFail', function(message) {
		var username = prompt(message);
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