var soundEffects = {};
var app;

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

function pickRandomProperty(obj) {
    var result;
    var count = 0;
    for (var prop in obj)
        if (Math.random() < 1/++count)
           result = prop;
    return result;
}

function log(message, socket) {
	if(socket) {
		// prepend with socket id
		message = socket.id + ': ' + message;
	}
	
	console.log(message);
}

function allowDrop(ev) {
	ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("Text", ev.target.id);
}

function drop(ev) {
    ev.preventDefault();
    var data = ev.dataTransfer.getData("text");
	ev.target.appendChild(document.getElementById(data));
	
	app.myTowel = $('#' + data).attr('type');
	app.myTowelTarget = $(ev.target).attr('type');
}

(function() {
	// init socket
	var socket = io();
	
	app = new Vue({
		el: '#rps',
		data: {
			enemyPlayer: {
				hands: []
			},
			thisPlayer: {
				hands: [],
				towels: []
			},
			playedHands: [],
			username: '',
			challengedBy: '',
			player1Name: '',
			player2Name: '',
			initialTowelAmount: 3,
			towels: [],
			myTowel: '',
			myTowelTarget: '',
			otherUsers: [],
			towelPrototypes: {
				impendingdoom: {
					name: 'Towel of impending doom',
					description: "This towel's fabric is so irritating that it does 3 damage to any hand it's thrown at.",
					emblemIcon: "fab fa-hotjar"
				},
				unfathomabledarkness: {
					name: 'Towel of unfathomable darkness',
					description: "This towel wraps around an enemy hand and thus renders it useless for 2 rounds.",
					emblemIcon: "fas fa-adjust"
				},
				disproportionatebludgeoning: {
					name: 'Towel of disproportionate bludgeoning',
					description: "This towel is so heavy that when wrapped around a hand it deals extra damage.",
					emblemIcon: "fas fa-stop"
				},
				magnificentalleviation: {
					name: 'Towel of magnificent alleviation',
					description: "This towel had aloe vera spilled on it and now it has healing properties.",
					emblemIcon: "fas fa-heart"
				}
			},
			handPrototypes: {
				rock: {
					name: 'rock',
					health: 7,
					freeze: 0,
					result: {
						paper: {
							name: 'paper',
							text: 'is covered by',
							win: false,
							damage: 0
						},
						scissors: {
							name: 'scissors',
							text: 'crushes',
							win: true,
							damage: 3
						},
						lizard: {
							name: 'lizard',
							text: 'crushes',
							win: true,
							damage: 3
						},
						spock: {
							name: 'spock',
							text: 'is vaporized by',
							win: false,
							damage: 0
						}
					}
				},
				paper: {
					name: 'paper',
					health: 5,
					freeze: 0,
					result: {
						rock: {
							name: 'rock',
							text: 'covers',
							win: true,
							damage: 3
						},
						scissors: {
							name: 'scissors',
							text: 'is cut by',
							win: false,
							damage: 0
						},
						lizard: {
							name: 'lizard',
							text: 'is eaten by',
							win: false,
							damage: 0
						},
						spock: {
							name: 'spock',
							text: 'disproves',
							win: true,
							damage: 3
						}
					}
				},
				scissors: {
					name: 'scissors',
					health: 5,
					freeze: 0,
					result: {
						rock: {
							name: 'rock',
							text: 'are crushed by',
							win: false,
							damage: 1
						},
						paper: {
							name: 'paper',
							text: 'cut',
							win: true,
							damage: 3
						},
						lizard: {
							name: 'lizard',
							text: 'decapitate',
							win: true,
							damage: 3
						},
						spock: {
							name: 'spock',
							text: 'are smashed by',
							win: false,
							damage: 1
						}
					}
				},
				lizard: {
					name: 'lizard',
					health: 5,
					freeze: 0,
					result: {
						rock: {
							name: 'rock',
							text: 'is crushed by',
							win: false,
							damage: 0
						},
						paper: {
							name: 'paper',
							text: 'eats',
							win: true,
							damage: 3
						},
						scissors: {
							name: 'scissors',
							text: 'is decapitated by',
							win: false,
							damage: 0
						},
						spock: {
							name: 'spock',
							text: 'poisons',
							win: true,
							damage: 3
						}
					}
				},
				spock: {
					name: 'spock',
					health: 5,
					freeze: 0,
					result: {
						rock: {
							name: 'rock',
							text: 'vaporizes',
							win: true,
							damage: 3
						},
						paper: {
							name: 'paper',
							text: 'is disproved by',
							win: false,
							damage: 0
						},
						scissors: {
							name: 'scissors',
							text: 'smashes',
							win: true,
							damage: 3
						},
						lizard: {
							name: 'lizard',
							text: 'is poisoned by',
							win: false,
							damage: 0
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
			gameInProgress: function() {
				return !(!this.player1Name || !this.player2Name);
			},
			gameOver: function() {
				var result = true;
				
				for (var i = 0; i < this.enemyPlayer.hands.length; i++) {
					if (this.enemyPlayer.hands[i].health > 0) {
						result = false;
						break;
					}
				}
				
				// enemy cannot play anymore, we're done
				if (result) {
					return result;
				}
				
				// reset and check if this player can still play
				result = true;
				
				for (var i = 0; i < this.thisPlayer.hands.length; i++) {
					if (this.thisPlayer.hands[i].health > 0) {
						result = false;
						break;
					}
				}
				
				return result;
			},
			thisUserIsPlaying: function() {
				return this.username === this.player1Name;
			}
		},
		watch: {
			playedHands: {
				handler: function(newValue) {
					// console.log('new ' + JSON.stringify(newValue));
					
					// reset values of hands to initial values from prototypes
					this.thisPlayer.hands.forEach(function(hand) {
						hand.health = app.handPrototypes[hand.name].health;
						hand.freeze = 0;
					});
					this.enemyPlayer.hands.forEach(function(hand) {
						hand.health = app.handPrototypes[hand.name].health;
						hand.freeze = 0;
					});
					
					// run the current history
					newValue.forEach(function(playedHand) {
						app.showDown(playedHand);
					});
				},
				deep: true
			}
		},
		methods: {
			showDown: function(playedHand) {
				if (playedHand.myHandName && playedHand.otherHandName && playedHand.myHandName !== playedHand.otherHandName) {
					var myHandPrototype = this.handPrototypes[playedHand.myHandName];
					var otherHandPrototype = this.handPrototypes[playedHand.otherHandName];
					var myHand = this.thisPlayer.hands.find(function (hand) { return hand.name === playedHand.myHandName });
					var otherHand = this.enemyPlayer.hands.find(function (hand) { return hand.name === playedHand.otherHandName });
					
					// do damage
					myHand.health -= otherHandPrototype.result[playedHand.myHandName].damage;
					otherHand.health -= myHandPrototype.result[playedHand.otherHandName].damage;
				}
			},
			endGame: function() {
				// clear all game data
				this.clearGameData();
				// send to server to do the same
				socket.emit('endGame');
			},
			clearGameData: function() {
				logic.clearSession(this);
				this.enemyPlayer.hands.splice(0);
				this.thisPlayer.hands.splice(0);
				this.thisPlayer.towels.splice(0);
			},
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
			playHand: function(myHandName) {
				log('hand played by me: ' + myHandName, socket);
				
				logic.savePlayedHandToHistory(this.playedHands, 'myHandName', myHandName);
				
				var playedHandJson = JSON.stringify({
					username: this.player1Name,
					otherUsername: this.player2Name,
					myHandName: myHandName,
					myTowel: this.myTowel,
					myTowelTarget: this.myTowelTarget
				});
				
				this.myTowel = '';
				this.myTowelTarget = '';
				
				socket.emit('playHand', playedHandJson);
			},
			challengeUser: function(username) {
				socket.emit('challengeUser', username);
			},
			acceptChallenge: function() {
				socket.emit('challengeAccepted', this.challengedBy);
			},
			rejectChallenge: function() {
				this.challengedBy = '';
				socket.emit('challengeRejected', this.challengedBy);
			},
			addHandToDeck: function(player, type){
				var cardSound = new Audio('media/carddeal.wav');
				cardSound.play();
				
				var hand = this.handPrototypes[type];
				this[player].hands.push(clone(hand));
			},
			addTowelToDeck: function(player, type){
				var towel = this.towelPrototypes[type];
				this[player].towels.push(clone(towel));
			},
			resumeSession: function(session) {
				this.username = session.username;
				this.player1Name = session.player1Name;
				this.player2Name = session.player2Name;
				
				session.towels.forEach(function(towel) {
					app.towels.push(towel);
				});
				
				this.drawHands(true);
				this.drawTowels();
				
				session.playedHands.forEach(function(playedHand) {
					app.playedHands.push(playedHand);
				});
				
				session.otherUsers.forEach(function(otherUser) {
					app.otherUsers.push(otherUser);
				});
			},
			drawTowels: function(){
				if (!this.thisUserIsPlaying) {
					// only draw towels if I am actually playing
					return;
				}
				
				for(var i = 0; i < app.initialTowelAmount; i++) {
					app.addTowelToDeck('thisPlayer', app.towels[i]);
				}
			},
			drawHands: function(immediate){
				if (!this.thisUserIsPlaying) {
					// only draw hands if I am actually playing
					return;
				}
				
				var i = 3;
				var _this = this;
				var dealCardInterval = 300;
				
				soundEffects.shuffling.play();
				
				for(var handKey in this.handPrototypes) {
					if (immediate) {
						_this.addHandToDeck('enemyPlayer', handKey);
					} else {
						setTimeout(function(handKey) {
							_this.addHandToDeck('enemyPlayer', handKey);
						},
						i*dealCardInterval,
						handKey);
						
						i++;
					}
				}
				
				for(var handKey in this.handPrototypes) {
					if (immediate) {
						_this.addHandToDeck('thisPlayer', handKey);
					} else {
						setTimeout(function(handKey) {
							_this.addHandToDeck('thisPlayer', handKey);
						}, 
						i*dealCardInterval,
						handKey);
						
						i++;
					}
				}
			}
		}
	});
	
	socket.on('handChosen', function(player2Name) {
		log('hand was chosen, but not yet played by other: ' + player2Name, socket);
		if (player2Name === app.player2Name || app.username !== app.player1Name) {
			// show chosen message if the player is my opponent or if I am a spectator
			logic.savePlayedHandToHistory(app.playedHands, 'otherHasChosen', true);
		}
	});
	
	socket.on('playHand', function(playedHandJson) {
		log('hand was played by other: ' + playedHandJson, socket);
		var playedHand = JSON.parse(playedHandJson);

		if (playedHand.username === app.player2Name && playedHand.otherUsername === app.player1Name) {
			// save hand if it is from my opponent to me (this is also when I am a spectator and the hand is from player 2)
			logic.savePlayedHandToHistory(app.playedHands, 'otherTowel', playedHand.myTowel);
			logic.savePlayedHandToHistory(app.playedHands, 'otherTowelTarget', playedHand.myTowelTarget);
			logic.savePlayedHandToHistory(app.playedHands, 'otherHandName', playedHand.myHandName);
		} else if (app.username !== app.player1Name) {
			// or if I am a spectator of the match (and the hand is from player 1)
			logic.savePlayedHandToHistory(app.playedHands, 'myTowel', playedHand.myTowel);
			logic.savePlayedHandToHistory(app.playedHands, 'myTowelTarget', playedHand.myTowelTarget);
			logic.savePlayedHandToHistory(app.playedHands, 'myHandName', playedHand.myHandName);
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
	
	socket.on('playerJoined', function(username) {
		log('player has joined: ' + username, socket);
		
		app.otherUsers.push({
			name: username
		});
	});
	
	socket.on('playerDisconnected', function(username) {
		log('player has disconnected: ' + username, socket);
		logic.removeFromOtherUsers(app.otherUsers, username);
	});
	
	socket.on('challengedByUser', function(username) {
		log('challenged by user: ' + username, socket);
		app.challengedBy = username;
	});
	
	socket.on('challengeRejected', function(username) {
		alert(username + ' has rejected your challenge :(');
	});
	
	socket.on('gameStarted', function(partialSessionJson) {
		log('gameStarted: ' + partialSessionJson, socket);
		
		// save partial session details
		var partialSession = JSON.parse(partialSessionJson);
		logic.savePlayerNamesToSession(app, partialSession.player1Name, partialSession.player2Name);
		
		// clear history and towels and challenge
		app.playedHands.splice(0);
		app.towels.splice(0);
		app.challengedBy = '';
		
		// randomly pick from available towels
		for(var i = 0; i < app.initialTowelAmount; i++) {
			var randomTowel = pickRandomProperty(app.towelPrototypes);
			app.towels.push(randomTowel);
		}
		
		// and let server know that
		socket.emit('towelsChosen', JSON.stringify(app.towels));
		
		// draw it all
		app.drawHands();
		app.drawTowels();
	});
	
	socket.on('gameEnded', function() {
		log('gameEnded', socket);
		app.clearGameData();
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