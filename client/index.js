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

(function() {
	// init socket
	var socket = io();
	
	var app = new Vue({
		el: '#rps',
		data: {
			enemyPlayer: {
				hands: [],
				towels: []
			},
			thisPlayer: {
				hands: [],
				towels: []
			},
			ui: {
				playerUI: 'lobby',
				messageToUser: '',
			},
			playedHands: [],
			username: '',
			challengedBy: '',
			player1Name: '',
			player2Name: '',
			myTowelId: '',
			myTowel: '',
			myTowelTarget: '',
			otherUsers: [],
			chatMessages: [],
			newMessages: 0,
			chatMessage: ''
		},
		computed: {
			handPrototypes: function() {
				return logic.staticData.handPrototypes;
			},
			myHandName: function() {
				return this.playedHands.length > 0 ? this.playedHands[this.playedHands.length - 1].myHandName : '';
			},
			otherHandName: function() {
				return this.playedHands.length > 0 ? this.playedHands[this.playedHands.length - 1].otherHandName : '';
			},
			otherHasChosen: function() {
				return this.playedHands.length > 0 ? this.playedHands[this.playedHands.length - 1].otherHasChosen : false;
			},
			gameInProgress: function() {
				return this.player1Name && this.player2Name;
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
					
					// and of towels
					this.enemyPlayer.towels.splice(0);
					this.thisPlayer.towels.splice(0);
					this.drawTowels();
					
					// run the current history
					newValue.forEach(function(playedHand) {
						app.showDown(playedHand);
					});

					// scroll the history overview down
					this.scrollElementDown('.history-overview');
				},
				deep: true
			},
			chatMessages: function() {
				this.scrollElementDown('.chat-messages');
			}
		},
		methods: {
			scrollElementDown: function(element){
				// move the element to the bottom after the DOM has updated
				Vue.nextTick(function() {
					var container = app.$el.querySelector(element);
					container.scrollTop = container.scrollHeight;
				});
			},
			showDown: function(playedHand) {
				if (playedHand.myHandName && playedHand.otherHandName && this.thisUserIsPlaying) {
					var myHandPrototype = this.handPrototypes[playedHand.myHandName];
					var otherHandPrototype = this.handPrototypes[playedHand.otherHandName];
					var myHand = this.thisPlayer.hands.find(function (hand) { return hand.name === playedHand.myHandName });
					var otherHand = this.enemyPlayer.hands.find(function (hand) { return hand.name === playedHand.otherHandName });
					var damageToMyself = 0;
					var damageToOther = 0;
					
					if (playedHand.myHandName !== playedHand.otherHandName) {
						damageToMyself = otherHandPrototype.result[playedHand.myHandName].damage;
						damageToOther = myHandPrototype.result[playedHand.otherHandName].damage;
						
						// do damage
						myHand.health -= damageToMyself;
						otherHand.health -= damageToOther;
					}
					
					// do my towel
					if (playedHand.myTowel === 'disproportionatebludgeoning' && damageToOther > 0) {
						// disproportionatebludgeoning: 2 dmg, but only if there was damage
						otherHand.health -= 2;
					} else if (playedHand.myTowel === 'magnificentalleviation' && playedHand.myTowelTarget) {
						// magnificentalleviation: 2 health, but not above proto and can't heal the dead
						var targetHand = this.thisPlayer.hands.find(function (hand) { return hand.name === playedHand.myTowelTarget });
						var targetHandPrototype = this.handPrototypes[playedHand.myTowelTarget];
						
						if (targetHand.health > 0) {
							targetHand.health = targetHand.health > targetHandPrototype.health - 2 ? targetHandPrototype.health : targetHand.health + 2;
						}
					}
					
					// remove towel after use
					if (playedHand.myTowel) {
						var towelIndex = this.thisPlayer.towels.findIndex(function(towel) {
							return towel.name === playedHand.myTowel;
						});
						this.thisPlayer.towels.splice(towelIndex, 1);
					}
					
					// do other towel
					if (playedHand.otherTowel === 'disproportionatebludgeoning' && damageToMyself > 0) {
						// disproportionatebludgeoning: 2 dmg, but only if there was damage
						myHand.health -= 2;
					} else if (playedHand.otherTowel === 'magnificentalleviation' && playedHand.otherTowelTarget) {
						// magnificentalleviation: 2 health, but not above proto and can't heal the dead
						var targetHand = this.enemyPlayer.hands.find(function (hand) { return hand.name === playedHand.otherTowelTarget });
						var targetHandPrototype = this.handPrototypes[playedHand.otherTowelTarget];
						
						if (targetHand.health > 0) {
							targetHand.health = targetHand.health > targetHandPrototype.health - 2 ? targetHandPrototype.health : targetHand.health + 2;
						}
					}
					
					// remove towel after use
					if (playedHand.otherTowel) {
						this.enemyPlayer.towels.splice(0, 1);
					}
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
				this.enemyPlayer.towels.splice(0);
				this.thisPlayer.hands.splice(0);
				this.thisPlayer.towels.splice(0);
			},
			randomRotationDegree: function() {
				var modifier = Math.random() > 0.5 ? -1 : 1;
				return Math.floor(Math.random() * (5)) * modifier;
			},
			onDragStart: function(event) {
				// store the id of the towel so it can be moved on drop
				this.myTowelId = event.target.id;
			},
			lobbySwitch: function(tabClickedName){
				this.ui.playerUI = tabClickedName;
				
				if(tabClickedName === 'flamebox') {
					app.newMessages = 0;
					this.scrollElementDown('.chat-messages');
				}
			},
			onDrop: function(event) {
				// trade the id for the actual element
				var towelElem = document.getElementById(this.myTowelId);
				this.myTowelId = '';
				
				// move the towel to the hand
				event.target.appendChild(towelElem);
				
				// set the values in the model
				this.myTowel = towelElem.getAttribute('type');
				this.myTowelTarget = event.target.getAttribute('type');
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
				logic.savePlayedHandToHistory(this.playedHands, 'myTowel', this.myTowel);
				logic.savePlayedHandToHistory(this.playedHands, 'myTowelTarget', this.myTowelTarget);
				
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
			sendChatMessage: function() {
				if (this.chatMessage !== '') {
					socket.emit('chatMessage', this.username + ': ' + this.chatMessage);
					this.chatMessage = '';
				}
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
				var handClone = clone(hand);
				handClone.rotation = this.randomRotationDegree();
				this[player].hands.push(handClone);
			},
			addTowelToDeck: function(player, type){
				var towel = logic.staticData.towelPrototypes[type];
				this[player].towels.push(clone(towel));
			},
			resumeSession: function(session) {
				this.username = session.username;
				this.player1Name = session.player1Name;
				this.player2Name = session.player2Name;
				
				session.towels.forEach(function(towel) {
					logic.repos.initialTowels.push(towel);
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
				
				for(var i = 0; i < logic.staticData.initialTowelAmount; i++) {
					app.addTowelToDeck('thisPlayer', logic.repos.initialTowels[i]);
				}
				
				// draw mock towels for the enemy
				for(var i = 0; i < logic.staticData.initialTowelAmount; i++) {
					this.enemyPlayer.towels.push({
						name: 'unknown',
						title: 'Unknown towel',
						description: "This towel's identity is secret.",
						emblemIcon: "fas fa-question"
					});
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
				
				for (var handKey in this.handPrototypes) {
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
				
				for (var handKey in this.handPrototypes) {
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
	
	socket.on('disconnect', function() {
		app.ui.messageToUser = 'Server appears to be down!';
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
		
		if (playedHand.myTowel && app.thisUserIsPlaying) {
			// reset my towel
			app.$el.querySelector('.thisplayerside .spelldeck').appendChild(app.$el.querySelector('.thisplayerside .towel'));
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
		app.ui.messageToUser = username + ' has rejected your challenge :(';
	});
	
	socket.on('chatMessage', function(chatMessage) {
		if(app.ui.playerUI !== 'flamebox'){
			app.newMessages++;
		}

		app.chatMessages.push(chatMessage);
	});
	
	socket.on('gameStarted', function(partialSessionJson) {
		log('gameStarted: ' + partialSessionJson, socket);
		
		// save partial session details
		var partialSession = JSON.parse(partialSessionJson);
		logic.savePlayerNamesToSession(app, partialSession.player1Name, partialSession.player2Name);
		
		// clear history and towels and challenge
		app.playedHands.splice(0);
		logic.repos.initialTowels.splice(0);
		app.challengedBy = '';
		
		// randomly pick from available towels
		for(var i = 0; i < logic.staticData.initialTowelAmount; i++) {
			var randomTowel = pickRandomProperty(logic.staticData.towelPrototypes);
			logic.repos.initialTowels.push(randomTowel);
		}
		
		// and let server know that
		socket.emit('towelsChosen', JSON.stringify(logic.repos.initialTowels));
		
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


