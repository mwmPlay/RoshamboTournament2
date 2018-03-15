var soundEffects = {};

document.addEventListener("DOMContentLoaded", function(event) { 
	var carddeal = document.getElementById("carddeal-sound");
	soundEffects.carddeal = carddeal;
	var carddeal2 = document.getElementById("carddeal-sound2");
	soundEffects.carddeal2 = carddeal2;
	var shuffling = document.getElementById("shuffling-sound");
	soundEffects.shuffling = shuffling;

/*	var backgroundMusic = document.getElementById("background-music");
	soundEffects.backgroundMusic = backgroundMusic;
    backgroundMusic.play();

   $('.handsdeck').on('mouseenter', '.hand[type="scissors"]', function(){
		var scissorsSound = document.getElementById("scissors-sound");
		soundEffects.scissorsSound = scissorsSound;
		scissorsSound.play();
	})
	.on('mouseenter', '.hand[type="rock"]', function(){
		var rockSound = document.getElementById("rock-sound");
		soundEffects.rockSound = rockSound;
		rockSound.play();
	})
	.on('mouseenter', '.hand[type="paper"]', function(){
		var paperSound = document.getElementById("paper-sound");
		soundEffects.paperSound = paperSound;
		paperSound.play();
	})
	.on('mouseenter', '.hand[type="spock"]', function(){
		var spockSound = document.getElementById("spock-sound");
		soundEffects.spockSound = spockSound;
		spockSound.play();
	})
	.on('mouseenter', '.hand[type="lizard"]', function(){
		var lizardSound = document.getElementById("lizard-sound");
		soundEffects.lizardSound = lizardSound;
		lizardSound.play();
	});*/
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
				hands: []
			},
			thisPlayer: {
				hands: []
			},
			playedHands: [],
			maxScore: 3,
			username: '',
			otherUsername: '',
			otherUsers: [],
			handPrototypes: {
				rock: {
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
				paper: {
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
				scissors: {
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
				lizard: {
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
				spock: {
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
			}
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
			randomRotationDegree: function () {
				var modifier = Math.random() > 0.5 ? -1 : 1;
				return Math.floor(Math.random() * (5)) * modifier;
			},
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
						var hand = this.handPrototypes[myHandName];
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
				var _this = this;
				
				this.playedHands.forEach(function (playedHand) {
					if (playedHand.myHandName !== '' && playedHand.otherHandName !== '' && playedHand.myHandName !== playedHand.otherHandName) {
						var myHand = _this.handPrototypes[playedHand.myHandName];
						var handResult = myHand.result[playedHand.otherHandName];
						
						result += won === handResult.win ? 1 : 0;
					}
				});
				
				return result;
			},
			newGame: function() {
				this.playedHands.splice(0); 
				socket.emit('newGame', this.username);
			},
			addHandToDeck: function(player, type){
				var cardSound = new Audio('media/carddeal.wav');
				cardSound.play();
				
				var newCardObj = this.handPrototypes[type];

				this[player].hands.push(newCardObj);
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

				this.drawHands();
			},
			drawHands: function(){
				var i = 3;
				var _this = this;
				var dealCardInterval = 300;

				soundEffects.shuffling.play();

				for(var handKey in this.handPrototypes) {
					setTimeout(function(handKey) {
						_this.addHandToDeck('enemyPlayer', handKey);
					},
					i*dealCardInterval,
					handKey);

					i++;
				}

				for(var handKey in this.handPrototypes) {
					setTimeout(function(handKey) {
						_this.addHandToDeck('thisPlayer', handKey);
					}, 
					i*dealCardInterval,
					handKey);
					
					i++;
				}

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
		
		if (!app.otherUsername) {
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