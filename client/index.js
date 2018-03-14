var hands = [
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
];
var soundEffects = {};

document.addEventListener("DOMContentLoaded", function(event) { 
	var backgroundMusic = document.getElementById("background-music");
	soundEffects.backgroundMusic = backgroundMusic;
    backgroundMusic.play();
});

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
		el: '#rps',
		data: {
			enemyPlayer: {
				hands: [ // Deze objecten moeten eigenlijk leeg zijn en dan gevuld worden bij initialize
					{
						name: 'rock',
						id: 1,
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
						id: 2,
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
						id: 3,
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
						id: 4,
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
						id: 5,
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
				]
			},
			thisPlayer: {
				hands: [
					{
						name: 'rock',
						id: 1,
						isSelected: false,
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
						id: 2,
						isSelected: false,
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
						id: 3,
						isSelected: false,
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
						id: 4,
						isSelected: false,
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
						id: 5,
						isSelected: false,
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
				]
			},
			playedHands: [],
			maxScore: 3,
			username: '',
			otherUsername: '',
			otherUsers: []
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
						var hand = hands.find(function(elem) {
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
			playHand: function(myHandName, handIndex) {
				log('hand played by me: ' + myHandName, socket);
				
				logic.savePlayedHandToHistory(this.playedHands, 'myHandName', myHandName);
				
				var playedHandJson = JSON.stringify({
					username: this.username,
					otherUsername: this.otherUsername,
					myHandName: myHandName
				});
				
				socket.emit('playHand', playedHandJson);
			},
			calculateTotalScore: function (won) {
				var result = 0;
				
				this.playedHands.forEach(function (playedHand) {
					if (playedHand.myHandName !== '' && playedHand.otherHandName !== '' && playedHand.myHandName !== playedHand.otherHandName) {
						var myHand = hands.find(function(elem) {
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
				logic.savePlayedHandToHistory(this.playedHands, 'myHandName', '');
			},
			newGame: function() {
				this.playedHands.splice(0);
				socket.emit('newGame', this.username);

				this.addHandToDeck('enemyPlayer', 'rock');
				this.addHandToDeck('enemyPlayer', 'paper');
				this.addHandToDeck('enemyPlayer', 'scissors');
				this.addHandToDeck('enemyPlayer', 'spock');
				this.addHandToDeck('enemyPlayer', 'lizard');
				this.addHandToDeck('thisPlayer', 'rock');
				this.addHandToDeck('thisPlayer', 'paper');
				this.addHandToDeck('thisPlayer', 'scissors');
				this.addHandToDeck('thisPlayer', 'spock');
				this.addHandToDeck('thisPlayer', 'lizard');
			},
			addHandToDeck: function(player, type){
				this[player].hands.push(hands[type]);
			},
			resumeSession: function(session) {
				this.username = session.username;
				this.otherUsername = session.otherUsername;
				
				session.playedHands.forEach(function(playedHand) {
					app.playedHands.push(playedHand);
				});
				
				session.otherUsers.forEach(function(otherUser) {
					app.otherUsers.push(otherUser);
				});
			}
		}
	});
	
	socket.on('handChosen', function(otherUsername) {
		log('hand was chosen, but not yet played by other: ' + otherUsername, socket);
		logic.savePlayedHandToHistory(app.playedHands, 'otherHasChosen', true);
	});
	
	socket.on('playHand', function(playedHandJson) {
		log('hand was played by other: ' + playedHandJson, socket);
		var playedHand = JSON.parse(playedHandJson);
		
		if (playedHand.username === app.otherUsername && playedHand.otherUsername === app.username) {
			logic.savePlayedHandToHistory(app.playedHands, 'otherHandName', playedHand.myHandName);
		}
	});
	
	socket.on('resumeSession', function(sessionJson) {
		log('resuming session: ' + sessionJson, socket);
		var session = JSON.parse(sessionJson);
		app.resumeSession(session);
	});
	
	socket.on('authenticateSuccess', function(sessionJson) {
		log('successfully authenticated: ' + sessionJson, socket);
		var session = JSON.parse(sessionJson);
		document.cookie = 'sessionId=' + session.id;
		app.resumeSession(session);
	});
	
	socket.on('playerJoined', function(otherUsername) {
		log('player has joined: ' + otherUsername, socket);
		
		if (app.otherUsername === '') {
			app.otherUsername = otherUsername;
		}
		
		app.otherUsers.push({
			name: otherUsername
		});
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