var soundEffects = {};

document.addEventListener("DOMContentLoaded", function(event) { 
	var carddeal = document.getElementById("carddeal-sound");
	soundEffects.carddeal = carddeal;
	var carddeal2 = document.getElementById("carddeal-sound2");
	soundEffects.carddeal2 = carddeal2;
	var shuffling = document.getElementById("shuffling-sound");
	soundEffects.shuffling = shuffling;
	var backgroundMusic = document.getElementById("background-music");
	soundEffects.backgroundMusic = backgroundMusic;
	var buttonClick = document.getElementById("buttonclick-sound");
	soundEffects.buttonClick = buttonClick;
	var newMessage = document.getElementById("newmessage-sound");
	soundEffects.newMessage = newMessage;
	var scissorsSound = document.getElementById("scissors-sound");
	soundEffects.scissorsSound = scissorsSound;
	var rockSound = document.getElementById("rock-sound");
	soundEffects.rockSound = rockSound;
	var paperSound = document.getElementById("paper-sound");
	soundEffects.paperSound = paperSound;
	var spockSound = document.getElementById("spock-sound");
	soundEffects.spockSound = spockSound;
	var lizardSound = document.getElementById("lizard-sound");
	soundEffects.lizardSound = lizardSound;

	//backgroundMusic.play(); // << turn off while developing to prevent suicide
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
				promptMessage: '',
				pickedUserName: '',
				musicOn: true
			},
			showdownUI: {
				enemyPlayerDamageTaken: 0,
				thisPlayerDamageTaken: 0,
				showTowels: false
			},
			gameSettings: {
				towelShowdownSpeed: 2500
			},
			playedHands: [],
			username: '',
			challengedBy: '',
			player1Name: '',
			player2Name: '',
			myDraggedTowel: '',
			myTowel: '',
			myTowelTarget: '',
			myTowelEmblemIcon: '',
			myTowelOnEnemy: false,
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
			mySelectedTowel: function() {
				if(this.playedHands.length > 0 && this.playedHands[this.playedHands.length - 1].myTowel) {
					var towelName = this.playedHands[this.playedHands.length - 1].myTowel;
				} else {
					return '';
				}
				
				return logic.staticData.towelPrototypes[towelName];
			},
			otherSelectedTowel: function() {
				if(this.playedHands.length > 0 && this.playedHands[this.playedHands.length - 1].otherTowel) {
					var towelName = this.playedHands[this.playedHands.length - 1].otherTowel;
				} else {
					return '';
				}
				
				return logic.staticData.towelPrototypes[towelName];
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
					newValue.forEach(function(playedHand, index) {
						var finalHand = index === newValue.length - 1;
						app.showDown(playedHand, finalHand);
					});
					
					// scroll the history overview down
					this.scrollElementDown('.history-overview');
				},
				deep: true
			},
			chatMessages: function() {
				this.scrollElementDown('.chat-messages');
			},
			'ui.promptMessage': function(newValue) {
				if (newValue != '') {
					Vue.nextTick(function() {
						var input = app.$el.querySelector('#username');
						input.focus();
					});
				}
			}
		},
		methods: {
			selectedCard: function(cardType){
				return this.playedHands.length > 0 && this.playedHands[this.playedHands.length - 1].myHandName === cardType;
			},
			scrollElementDown: function(element){
				// move the element to the bottom after the DOM has updated
				Vue.nextTick(function() {
					var container = app.$el.querySelector(element);
					container.scrollTop = container.scrollHeight;
				});
			},
			showDown: function(playedHand, finalHand) {
				if (playedHand.myHandName && playedHand.otherHandName && this.thisUserIsPlaying) {
					var myHandPrototype = this.handPrototypes[playedHand.myHandName];
					var otherHandPrototype = this.handPrototypes[playedHand.otherHandName];
					var myHand = this.thisPlayer.hands.find(function (hand) { return hand.name === playedHand.myHandName });
					var otherHand = this.enemyPlayer.hands.find(function (hand) { return hand.name === playedHand.otherHandName });
					var resultOfActions = {
						myself: {
							damageToOther: 0,
							healingToMyTarget: 0,
							damageToMyTarget: 0,
							freezeToMyTarget: 0
						},
						other: {
							damageToOther: 0,
							healingToMyTarget: 0,
							damageToMyTarget: 0,
							freezeToMyTarget: 0
						}
					};
					
					// calculate regular card damage
					if (playedHand.myHandName !== playedHand.otherHandName) {
						resultOfActions.myself.damageToOther = myHandPrototype.result[playedHand.otherHandName].damage;
						resultOfActions.other.damageToOther = otherHandPrototype.result[playedHand.myHandName].damage;
					}
					
					// do my towel
					if (playedHand.myTowel && playedHand.myTowelTarget) {
						logic.staticData.towelPrototypes[playedHand.myTowel].doAction(resultOfActions, 'myself', 'other');
						
						// remove towel after use
						var towelIndex = this.thisPlayer.towels.findIndex(function(towel) {
							return towel.name === playedHand.myTowel;
						});
						this.thisPlayer.towels.splice(towelIndex, 1);
					}
					
					// do other towel
					if (playedHand.otherTowel && playedHand.otherTowelTarget) {
						logic.staticData.towelPrototypes[playedHand.otherTowel].doAction(resultOfActions, 'other', 'myself');
						
						// remove towel after use
						if (playedHand.otherTowel) {
							this.enemyPlayer.towels.splice(0, 1);
						}
					}
					
					// now that the result of all actions is known, do damage
					myHand.health -= resultOfActions.other.damageToOther;
					otherHand.health -= resultOfActions.myself.damageToOther;
					
					// and handle freezing and defrosting
					logic.freezeAndDefrostHands(this.thisPlayer.hands, playedHand.myHandName);
					logic.freezeAndDefrostHands(this.enemyPlayer.hands, playedHand.otherHandName);
					
					// perform other results
					for (var player in { myself: '', other: '' }) {
						if (resultOfActions[player].healingToMyTarget > 0 || resultOfActions[player].damageToMyTarget > 0 || resultOfActions[player].freezeToMyTarget > 0) {
							var towelTarget = player === 'myself' ? playedHand.myTowelTarget : playedHand.otherTowelTarget;
							var towelName = player === 'myself' ? playedHand.myTowel : playedHand.otherTowel;
							var dropOnEnemy = logic.staticData.towelPrototypes[towelName].dropOnEnemy;
							var playerTarget = (dropOnEnemy && player === 'myself') || (!dropOnEnemy && player === 'other') ? this.enemyPlayer : this.thisPlayer;
							var targetHand = playerTarget.hands.find(function (hand) { return hand.name === towelTarget });
							var targetHandPrototype = this.handPrototypes[towelTarget];
							
							if (resultOfActions[player].healingToMyTarget > 0 && targetHand.health > 0) {
								// do not heal above proto's health and can't heal the dead
								targetHand.health = targetHand.health > targetHandPrototype.health - resultOfActions.myself.healingToMyTarget ? targetHandPrototype.health : targetHand.health + resultOfActions.myself.healingToMyTarget;
							}
							if (resultOfActions[player].damageToMyTarget > 0) {
								targetHand.health -= resultOfActions[player].damageToMyTarget;
							}
							if (resultOfActions[player].freezeToMyTarget > 0) {
								targetHand.freeze += resultOfActions[player].freezeToMyTarget;
							}
						}
					}
					
					// Showdown UI is handled here (only for the final hand, no need to show previous hands again)
					if(finalHand) {
						//reset previous values
						app.showdownUI = {
							enemyPlayerDamageTaken: -resultOfActions.myself.damageToOther,
							thisPlayerDamageTaken: -resultOfActions.other.damageToOther,
							showTowels: false
						};
						
						var winningHandName = resultOfActions.other.damageToOther > resultOfActions.myself.damageToOther ? otherHandPrototype.name : myHandPrototype.name;
						soundEffects[winningHandName + 'Sound'].play();
						
						setTimeout(function(){
							var sdUI = app.showdownUI;
							sdUI.showTowels = true;
						}, app.gameSettings.towelShowdownSpeed);
					}
				}
			},
			endGame: function() {
				// clear all game data
				this.clearGameData();
				// send to server to do the same
				socket.emit('endGame');
			},
			toggleMusic: function(){
				app.ui.musicOn = !app.ui.musicOn;
				
				if(app.ui.musicOn){
					soundEffects.backgroundMusic.play();
				} else {
					soundEffects.backgroundMusic.pause();
				}
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
			lobbySwitch: function(tabClickedName){
				this.ui.playerUI = tabClickedName;
				
				if(tabClickedName === 'flamebox') {
					app.newMessages = 0;
					this.scrollElementDown('.chat-messages');
					this.$els.chatMessageInput.focus();
				}
			},
			onDragStart: function(event) {
				var enemyHandsAppearance, thisHandsAppearance;

				// store the type of the towel so it can be moved on drop
				this.myDraggedTowel = event.target.getAttribute('type');

				if(logic.staticData.towelPrototypes[this.myDraggedTowel].dropOnEnemy) {
					thisHandsAppearance = 'none';
					enemyHandsAppearance = 'droppable';
				} else {
					thisHandsAppearance = 'droppable';
					enemyHandsAppearance = 'none';
				}

				this.enemyPlayer.hands.forEach(function(hand){
					if(hand.freeze < 2) hand.appearance = enemyHandsAppearance;
				});

				this.thisPlayer.hands.forEach(function(hand){
					if(hand.freeze < 2) hand.appearance = thisHandsAppearance;
				});
			},
			onDragOver: function(event, isEnemy, hand) {
				// only allow drop if the towel is for the enemy and we are dropping on the enemy and vice versa
				if(logic.staticData.towelPrototypes[this.myDraggedTowel].dropOnEnemy === isEnemy) {
					hand.appearance = 'droppableAndHover';
					event.preventDefault();
				} 
			},
			onDragLeave: function(hand){
				hand.appearance = 'droppable';
			},
			onDragEnd: function(){
				this.enemyPlayer.hands.forEach(function(hand){
					hand.appearance = 'none';
				});

				this.thisPlayer.hands.forEach(function(hand){
					hand.appearance = 'none';
				});
			},
			onDrop: function(event, hand) {
				// restore previously used towel
				if (this.myTowel) {
					this.addTowelToDeck('thisPlayer', this.myTowel);
				}

				hand.appearance = 'none';
				
				// remove used towel from player
				var towelIndex = this.thisPlayer.towels.findIndex(function(towel) {
					return towel.name === app.myDraggedTowel
				});
				var usedTowel = this.thisPlayer.towels.splice(towelIndex, 1)[0];
				
				this.myTowel = this.myDraggedTowel;
				this.myTowelTarget = event.target.getAttribute('type');
				this.myTowelEmblemIcon = usedTowel.emblemIcon;
				this.myTowelOnEnemy = usedTowel.dropOnEnemy;

				this.enemyPlayer.hands.forEach(function(hand){
					hand.appearance = 'none';
				});

				this.thisPlayer.hands.forEach(function(hand){
					hand.appearance = 'none';
				});
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
			userPickedAName: function(){
				app.ui.promptMessage = '';
				socket.emit('authenticate', app.ui.pickedUserName);
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
			soundEffects.newMessage.play();
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
		app.ui.promptMessage = message;
	});
	
	if (document.cookie === '') {
		app.ui.promptMessage = 'Who are you?';
	} else {
		var sessionId = document.cookie.substring(10);
		socket.emit('resumeSession', sessionId);
	}
})();