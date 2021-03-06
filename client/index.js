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
	soundEffects.scissors = scissorsSound;
	var rockSound = document.getElementById("rock-sound");
	soundEffects.rock = rockSound;
	var paperSound = document.getElementById("paper-sound");
	soundEffects.paper = paperSound;
	var spockSound = document.getElementById("spock-sound");
	soundEffects.spock = spockSound;
	var lizardSound = document.getElementById("lizard-sound");
	soundEffects.lizard = lizardSound;

	var disproportionatebludgeoningSound = document.getElementById("disproportionatebludgeoning-sound");
	soundEffects.disproportionatebludgeoning = disproportionatebludgeoningSound;
	var impendingdoomSound = document.getElementById("impendingdoom-sound");
	soundEffects.impendingdoom = impendingdoomSound;
	var magnificentalleviationSound = document.getElementById("magnificentalleviation-sound");
	soundEffects.magnificentalleviation = magnificentalleviationSound;
	var unfathomabledarknessSound = document.getElementById("unfathomabledarkness-sound");
	soundEffects.unfathomabledarkness = unfathomabledarknessSound;

	//backgroundMusic.play(); // << turn off while developing to prevent suicide
});

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
	
	Vue.component('popup', {
		props: ['message', 'value', 'inputText', 'showButtons', 'buttonText', 'cancelButtonText', 'tournament'],
		template: '#popup-template'
	});
	
	var app = new Vue({
		el: '#rps',
		data: {
			enemy: {
				hands: [],
				towels: []
			},
			my: {
				hands: [],
				towels: []
			},
			ui: {
				playerUI: 'lobby',
				messageToUser: '',
				promptMessage: '',
				pickedUserName: '',
				selectedBracket: '',
				musicOn: true,
				playerChallenged: '',
				creatingTournament: false,
				pickedTournamentName: ''
			},
			showdownUI: {
				enemyDamageTaken: 0,
				myDamageTaken: 0,
				enemyShowTowel: 'none',
				myShowTowel: 'none',
				showdownMessage: ''
			},
			gameSettings: {
				towelShowdownSpeed: 2500
			},
			playedHands: [],
			surrendered: '',
			username: '',
			challengedBy: '',
			tournamentChallengeId: '',
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
			chatMessage: '',
			gameId: '',
			games: {},
			tournamentId: '',
			tournaments: {}
		},
		computed: {
			handPrototypes: function() {
				return logic.staticData.handPrototypes;
			},
			selectedTournament: function(){
				var tournament = this.tournaments;
				for(var tournamentKey in tournament) {
					if(tournament.hasOwnProperty(tournamentKey)) {
						var thisTournament = tournament[tournamentKey];

						if(thisTournament.name === this.ui.selectedBracket) return thisTournament;
					}
				}
				return {};
			},
			myHandName: function() {
				return this.playedHands.length > 0 ? this.playedHands[this.playedHands.length - 1].myHandName : '';
			},
			enemyHandName: function() {
				return this.playedHands.length > 0 ? this.playedHands[this.playedHands.length - 1].enemyHandName : '';
			},
			mySelectedTowel: function() {
				if(this.playedHands.length > 0 && this.playedHands[this.playedHands.length - 1].myTowel) {
					var towelName = this.playedHands[this.playedHands.length - 1].myTowel;
				} else {
					return '';
				}
				
				return logic.staticData.towelPrototypes[towelName];
			},
			enemySelectedTowel: function() {
				if(this.playedHands.length > 0 && this.playedHands[this.playedHands.length - 1].enemyTowel) {
					var towelName = this.playedHands[this.playedHands.length - 1].enemyTowel;
				} else {
					return '';
				}
				
				return logic.staticData.towelPrototypes[towelName];
			},
			enemyHasChosen: function() {
				return this.playedHands.length > 0 ? this.playedHands[this.playedHands.length - 1].enemyHasChosen : false;
			},
			gameInProgress: function() {
				return !(!this.player1Name || !this.player2Name);
			},
			player1Lost: function() {
				var result = this.gameInProgress;
				
				for (var i = 0; i < this.my.hands.length; i++) {
					if (this.my.hands[i].health > 0) {
						result = false;
						break;
					}
				}
				
				// this player cannot play anymore, we're done
				return result;
			},
			player2Lost: function() {
				var result = this.gameInProgress;
				
				for (var i = 0; i < this.enemy.hands.length; i++) {
					if (this.enemy.hands[i].health > 0) {
						result = false;
						break;
					}
				}
				
				// enemy player cannot play anymore, we're done
				return result;
			},
			gameOver: function() {
				return this.player1Lost !== this.player2Lost;
			},
			winMessage: function() {
				var result = "";
				
				if (this.gameOver) {
					var winner = this.player1Lost ? this.player2Name : this.player1Name;
					result = winner + " wins!";
					
					if (this.surrendered) {
						result += " " + this.surrendered + " has surrendered!";
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
					this.my.hands.forEach(function(hand) {
						hand.health = app.handPrototypes[hand.name].health;
						hand.freeze = 0;
					});
					this.enemy.hands.forEach(function(hand) {
						hand.health = app.handPrototypes[hand.name].health;
						hand.freeze = 0;
					});
					
					// and of towels
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
			},
			surrendered: function(newValue) {
				if (this.player1Name === newValue) {
					logic.surrender(this.my);
				} else if (this.player2Name === newValue) {
					logic.surrender(this.enemy);
				}
			},
			gameId: function(newValue) {
				if (newValue) {
					var game = this.games[newValue];
					
					logic.savePlayerNamesToSession(this, game.player1.username, game.player2.username);
					
					// clear history and towels and challenge
					app.playedHands.splice(0);
					app.challengedBy = '';
					
					var player = game.player2.username === this.username ? 'player2' : 'player1';
					
					if (this.thisUserIsPlaying) {
						game[player].towels.forEach(function(towel) {
							logic.repos.initialTowels.push(towel);
						});
					}
					
					this.drawHands(true);
					this.drawTowels();
					
					this.playedHands.splice(0);
					game[player].playedHands.forEach(function(playedHand) {
						app.playedHands.push(playedHand);
					});
					
					this.surrendered = game.surrendered;
				} else {
					// clear all game data, but don't change game id again, or we start an infinite loop
					this.clearGameData(true);
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
			calcFreezeHeightUI: function(freezeAmt) {
				var freezePercentage = (freezeAmt / 2) * 100;
				return freezePercentage > 100 ? 100 : freezePercentage;
			},
			calcHealthHeightUI: function(hand){
				var handPrototype = this.handPrototypes[hand.name];
				var healthPercentage =  (handPrototype.health - hand.health) / handPrototype.health;
				return ((1 - healthPercentage) * 100).toFixed();
			},
			towelOnHand: function(handName, player){
				var lastHand = this.playedHands[this.playedHands.length - 1] || {};
				var enemyTowelPrototype = logic.staticData.towelPrototypes[this.showdownUI.enemyShowTowel];
				var myTowelPrototype = logic.staticData.towelPrototypes[this.showdownUI.myShowTowel];

				if(lastHand.enemyTowelTarget === handName) {
					if(player === 'my' && enemyTowelPrototype !== undefined && enemyTowelPrototype.dropOnEnemy) {
						return this.showdownUI.enemyShowTowel;
					} else if(player === 'enemy' && enemyTowelPrototype !== undefined && !enemyTowelPrototype.dropOnEnemy) {
						return this.showdownUI.enemyShowTowel;
					} 
				} else if(lastHand.myTowelTarget === handName) {					
					if(player === 'my' && myTowelPrototype !== undefined && !myTowelPrototype.dropOnEnemy) {
						return this.showdownUI.myShowTowel;
					} else if(player === 'enemy' && myTowelPrototype !== undefined && myTowelPrototype.dropOnEnemy) {
						return this.showdownUI.myShowTowel;
					} 
				}
					
				return '';
			},
			showDown: function(playedHand, finalHand) {
				if (playedHand.myHandName && playedHand.enemyHandName) {
					var myHandPrototype = this.handPrototypes[playedHand.myHandName];
					var enemyHandPrototype = this.handPrototypes[playedHand.enemyHandName];
					var myHand = this.my.hands.find(function (hand) { return hand.name === playedHand.myHandName });
					var enemyHand = this.enemy.hands.find(function (hand) { return hand.name === playedHand.enemyHandName });
					var resultOfActions = {
						my: {
							damageToEnemy: 0,
							healingToMyTarget: 0,
							damageToMyTarget: 0,
							freezeToMyTarget: 0
						},
						enemy: {
							damageToEnemy: 0,
							healingToMyTarget: 0,
							damageToMyTarget: 0,
							freezeToMyTarget: 0
						}
					};
					
					// calculate regular card damage
					if (playedHand.myHandName !== playedHand.enemyHandName) {
						resultOfActions.my.damageToEnemy = myHandPrototype.result[playedHand.enemyHandName].damage;
						resultOfActions.enemy.damageToEnemy = enemyHandPrototype.result[playedHand.myHandName].damage;
					}
					
					// do my towel
					if (playedHand.myTowel && playedHand.myTowelTarget) {
						logic.staticData.towelPrototypes[playedHand.myTowel].doAction(resultOfActions, 'my', 'enemy');
						
						// remove towel after use
						var towelIndex = this.my.towels.findIndex(function(towel) {
							return towel.name === playedHand.myTowel;
						});
						this.my.towels.splice(towelIndex, 1);
					}
					
					// do enemy towel
					if (playedHand.enemyTowel && playedHand.enemyTowelTarget) {
						logic.staticData.towelPrototypes[playedHand.enemyTowel].doAction(resultOfActions, 'enemy', 'my');
						
						// remove towel after use
						if (playedHand.enemyTowel) {
							this.enemy.towels.splice(0, 1);
						}
					}
					
					// now that the result of all actions is known, do damage
					myHand.health -= resultOfActions.enemy.damageToEnemy;
					enemyHand.health -= resultOfActions.my.damageToEnemy;
					
					// and handle freezing and defrosting
					logic.freezeAndDefrostHands(this.my.hands, playedHand.myHandName);
					logic.freezeAndDefrostHands(this.enemy.hands, playedHand.enemyHandName);
					
					// perform enemy results
					for (var player in { my: '', enemy: '' }) {
						if (resultOfActions[player].healingToMyTarget > 0 || resultOfActions[player].damageToMyTarget > 0 || resultOfActions[player].freezeToMyTarget > 0) {
							var towelTarget = player === 'my' ? playedHand.myTowelTarget : playedHand.enemyTowelTarget;
							var towelName = player === 'my' ? playedHand.myTowel : playedHand.enemyTowel;
							var dropOnEnemy = logic.staticData.towelPrototypes[towelName].dropOnEnemy;
							var playerTarget = (dropOnEnemy && player === 'my') || (!dropOnEnemy && player === 'enemy') ? this.enemy : this.my;
							var targetHand = playerTarget.hands.find(function (hand) { return hand.name === towelTarget });
							var targetHandPrototype = this.handPrototypes[towelTarget];

							if (resultOfActions[player].healingToMyTarget > 0 && targetHand.health > 0) {
								// do not heal above proto's health and can't heal the dead
								targetHand.health = targetHand.health > targetHandPrototype.health - resultOfActions[player].healingToMyTarget ? targetHandPrototype.health : targetHand.health + resultOfActions[player].healingToMyTarget;
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
						var lastHand = this.playedHands[this.playedHands.length - 1];

						app.showdownUI.enemyDamageTaken = -resultOfActions.my.damageToEnemy;
						app.showdownUI.myDamageTaken = -resultOfActions.enemy.damageToEnemy;
						app.showdownUI.showdownMessage = app.handResult(lastHand.enemyHandName, lastHand.myHandName);
						
						var winningHandName = resultOfActions.enemy.damageToEnemy > resultOfActions.my.damageToEnemy ? enemyHandPrototype.name : myHandPrototype.name;
						soundEffects[winningHandName].play();
						
						if (lastHand.enemyTowel) {
							setTimeout(function() {
								var towelPrototype = logic.staticData.towelPrototypes[lastHand.enemyTowel];
								app.showdownUI.showdownMessage = app.player2Name + ' uses ' + lastHand.enemyTowel + ' causing ' + lastHand.enemyTowelTarget + ' ' + towelPrototype.descriptionInAction;
								app.showdownUI.enemyShowTowel = lastHand.enemyTowel;
								soundEffects[lastHand.enemyTowel].play();
							}, app.gameSettings.towelShowdownSpeed);
						}
						
						if (lastHand.myTowel) {
							setTimeout(function() {
								var towelPrototype = logic.staticData.towelPrototypes[lastHand.myTowel];
								app.showdownUI.showdownMessage = app.player1Name + ' uses ' + lastHand.myTowel + ' causing ' + lastHand.myTowelTarget + ' ' + towelPrototype.descriptionInAction;
								app.showdownUI.myShowTowel = lastHand.myTowel;
								soundEffects[lastHand.myTowel].play();
							}, app.gameSettings.towelShowdownSpeed * 2);
						}
					}
				}
			},
			endGame: function() {
				// send to server to do the same there
				socket.emit('endGame', this.gameId, this.player1Lost);
				
				Vue.delete(this.games, this.gameId);
				
				// clear all game data
				this.clearGameData();
			},
			surrender: function() {
				this.surrendered = this.player1Name;
				socket.emit('surrender', this.gameId);
			},
			toggleMusic: function(){
				app.ui.musicOn = !app.ui.musicOn;
				
				if(app.ui.musicOn){
					soundEffects.backgroundMusic.play();
				} else {
					soundEffects.backgroundMusic.pause();
				}
			},
			clearGameData: function(skipGameId) {
				if (!skipGameId) {
					this.gameId = '';
				}
				
				this.surrendered = '';
				this.playedHands.splice(0);
				logic.repos.initialTowels.splice(0);
				this.player1Name = '';
				this.player2Name = '';
				
				// clear hands and towels
				this.enemy.hands.splice(0);
				this.enemy.towels.splice(0);
				this.my.hands.splice(0);
				this.my.towels.splice(0);
				
				// clear showdown UI
				this.clearShowdownUI();
			},
			clearShowdownUI: function(){
				this.showdownUI.enemyDamageTaken = 0;
				this.showdownUI.myDamageTaken = 0;
				this.showdownUI.enemyShowTowel = 'none';
				this.showdownUI.myShowTowel = 'none';
				this.showdownUI.showdownMessage = '';
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
					
					Vue.nextTick(function() {
						var input = app.$el.querySelector('#chatMessageInput');
						input.focus();
					}); 
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

				this.enemy.hands.forEach(function(hand){
					if(hand.freeze < 2) hand.appearance = enemyHandsAppearance;
				});

				this.my.hands.forEach(function(hand){
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
			onDragLeave: function(hand, isEnemy){
				if(logic.staticData.towelPrototypes[this.myDraggedTowel].dropOnEnemy === isEnemy) {
					hand.appearance = 'droppable';
				}
			},
			onDragEnd: function(){
				this.enemy.hands.forEach(function(hand){
					hand.appearance = 'none';
				});

				this.my.hands.forEach(function(hand){
					hand.appearance = 'none';
				});
			},
			onDrop: function(event, hand) {
				// restore previously used towel
				if (this.myTowel) {
					this.addTowelToDeck('my', this.myTowel);
				}

				hand.appearance = 'none';
				
				// remove used towel from player
				var towelIndex = this.my.towels.findIndex(function(towel) {
					return towel.name === app.myDraggedTowel
				});
				var usedTowel = this.my.towels.splice(towelIndex, 1)[0];
				
				this.myTowel = this.myDraggedTowel;
				this.myTowelTarget = event.target.getAttribute('type');
				this.myTowelEmblemIcon = usedTowel.emblemIcon;
				this.myTowelOnEnemy = usedTowel.dropOnEnemy;

				this.enemy.hands.forEach(function(hand){
					hand.appearance = 'none';
				});

				this.my.hands.forEach(function(hand){
					hand.appearance = 'none';
				});
			},
			handButtonTooltip: function (hand) {
				var tooltip = '';
				
				for (var enemyHandName in hand.result) {
					tooltip += this.handResult(hand.name, enemyHandName) + '\n';
				}
				
				return tooltip;
			},
			handResult: function (myHandName, enemyHandName) {
				if (myHandName && enemyHandName) {
					var resultText;
					var resultVerb;
					
					if (myHandName === enemyHandName) {
						var isPlural = myHandName.slice(-1) === 's';
						
						resultText = (isPlural ? 'are' : 'is') + ' the same as';
						resultVerb = 'draw' + (isPlural ? '' : 's');
					} else {
						var hand = this.handPrototypes[myHandName];
						var result = hand.result[enemyHandName];
						resultText = result.text;
						resultVerb = (result.win ? 'win' : 'lose') + (myHandName.slice(-1) === 's' ? '' : 's');
					}
					
					return myHandName + ' ' + resultText + ' ' + enemyHandName + ' and ' + resultVerb;
				} else {
					return '';
				}
			},
			playHand: function(myHandName) {
				log('hand played by me: ' + myHandName, socket);
				
				app.clearShowdownUI();
				
				logic.savePlayedHandToHistory(this.playedHands, 'myHandName', myHandName);
				logic.savePlayedHandToHistory(this.playedHands, 'myTowel', this.myTowel);
				logic.savePlayedHandToHistory(this.playedHands, 'myTowelTarget', this.myTowelTarget);
				
				var playedHandJson = JSON.stringify({
					gameId: this.gameId,
					myHandName: myHandName,
					myTowel: this.myTowel,
					myTowelTarget: this.myTowelTarget
				});
				
				this.myTowel = '';
				this.myTowelTarget = '';
				
				socket.emit('playHand', playedHandJson); 
			},
			userIsPlaying: function(username) {
				var result = false;
				
				for (var gameId in this.games) {
					var game = this.games[gameId];
					
					if (game.player1.username === username || game.player2.username == username) {
						result = true;
						break;
					}
				}
				
				return result;
			},
			challengeUser: function(username) {
				this.ui.playerChallenged = username;
				socket.emit('challengeUser', username);
			},
			createTournament: function() {
				this.ui.creatingTournament = false;
				socket.emit('createTournament', this.ui.pickedTournamentName);
				this.ui.pickedTournamentName = '';
			},
			sendChatMessage: function() {
				if (this.chatMessage !== '') {
					socket.emit('chatMessage', this.username + ': ' + this.chatMessage);
					this.chatMessage = '';
				}
			},
			acceptChallenge: function() {
				socket.emit('challengeAccepted', this.challengedBy);
				this.challengedBy = '';
			},
			rejectChallenge: function() {
				socket.emit('challengeRejected', this.challengedBy);
				this.challengedBy = '';
			},
			acceptTournamentChallenge: function() {
				socket.emit('joinTournament', this.tournamentChallengeId);
				this.tournamentId = this.tournamentChallengeId;
				this.tournamentChallengeId = '';
				this.tournaments[this.tournamentId].players.push(this.username);
			},
			rejectTournamentChallenge: function() {
				this.tournamentChallengeId = '';
			},
			startTournament: function() {
				this.tournaments[this.tournamentId].started = true;
				socket.emit('startTournament', this.tournamentId);
			},
			endTournament: function() {
				Vue.delete(this.tournaments, this.tournamentId);
				socket.emit('endTournament', this.tournamentId);
				this.tournamentId = '';
			},
			userPickedAName: function(){
				this.ui.promptMessage = '';
				socket.emit('authenticate', this.ui.pickedUserName);
			},
			addHandToDeck: function(player, type){
				var cardSound = new Audio('media/carddeal.wav');
				cardSound.play();
				
				var hand = this.handPrototypes[type];
				var handClone = logic.clone(hand);
				handClone.rotation = this.randomRotationDegree();
				this[player].hands.push(handClone);
			},
			addTowelToDeck: function(player, type){
				var towel = logic.staticData.towelPrototypes[type];
				this[player].towels.push(logic.clone(towel));
			},
			resumeSession: function(session) {
				this.username = session.username;
				
				this.otherUsers.splice(0);
				session.otherUsers.forEach(function(otherUser) {
					app.otherUsers.push(otherUser);
				});
				
				for (gameId in session.games) {
					Vue.set(app.games, gameId, session.games[gameId]);
				}
				
				for (tournamentId in session.tournaments) {
					Vue.set(app.tournaments, tournamentId, session.tournaments[tournamentId]);
				}
				
				this.gameId = session.gameId;
				this.tournamentId = session.tournamentId;
				this.challengedBy = session.challengedBy;
			},
			drawTowels: function() {
				if(!this.gameInProgress) {
					return;
				}
				
				// clear towels on both sides before (re-)adding them
				this.my.towels.splice(0);
				this.enemy.towels.splice(0);
				
				if (this.thisUserIsPlaying) {
					// only draw my towels if I am actually playing
					for(var i = 0; i < logic.repos.initialTowels.length; i++) {
						app.addTowelToDeck('my', logic.repos.initialTowels[i]);
					}
				} else {
					// enemywise draw mock towels
					logic.addMockTowels(this.my.towels);
				}
				
				// draw mock towels for the enemy
				logic.addMockTowels(this.enemy.towels);
			},
			// TODO: we need to separate the drawn hands from the actual hands? enemywise a delay causes all kinds of issues
			drawHands: function(immediate){
				var i = 3;
				var dealCardInterval = 300;
				
				soundEffects.shuffling.play();
				
				for (var handKey in this.handPrototypes) {
					if (immediate) {
						app.addHandToDeck('enemy', handKey);
					} /*else {
						setTimeout(function(handKey) {
							app.addHandToDeck('enemy', handKey);
						},
						i*dealCardInterval,
						handKey);
						
						i++;
					}*/
				}
				
				for (var handKey in this.handPrototypes) {
					if (immediate) {
						app.addHandToDeck('my', handKey);
					} /*else {
						setTimeout(function(handKey) {
							app.addHandToDeck('my', handKey);
						}, 
						i*dealCardInterval,
						handKey);
						
						i++;
					}*/
				}
			}
		}
	});
	
	socket.on('disconnect', function() {
		app.ui.messageToUser = 'Server appears to be down!';
	});
	
	socket.on('handChosen', function(playerName) {
		log('hand was chosen, but not yet played by enemy: ' + playerName, socket);
		
		// find the game id and the enemy player
		var enemy;
		var gameId;
		for (gameId in app.games) {
			var game = app.games[gameId];
			
			if (game.player1.username === playerName) {
				enemy = game.player2;
				break;
			} else if (game.player2.username === playerName) {
				enemy = game.player1;
				break;
			}
		}
		
		logic.savePlayedHandToHistory(enemy.playedHands, 'enemyHasChosen', true);
		
		if (app.gameId === gameId && app.player2Name === playerName) {
			// I am watching or playing this game and the player is my 'opponent', update me
			logic.savePlayedHandToHistory(app.playedHands, 'enemyHasChosen', true);
		}
	});
	
	socket.on('playHand', function(playedHandJson) {
		log('hand was played by enemy: ' + playedHandJson, socket);
		var playedHand = JSON.parse(playedHandJson);
		
		var game = app.games[playedHand.gameId];
		var whoPlayed = game.player1.username === playedHand.username ? 'player1' : 'player2';
		var enemy = whoPlayed === 'player1' ? 'player2' : 'player1';
		
		logic.savePlayedHandToHistory(game[whoPlayed].playedHands, 'myTowel', playedHand.myTowel);
		logic.savePlayedHandToHistory(game[whoPlayed].playedHands, 'myTowelTarget', playedHand.myTowelTarget);
		logic.savePlayedHandToHistory(game[whoPlayed].playedHands, 'myHandName', playedHand.myHandName);
		logic.savePlayedHandToHistory(game[enemy].playedHands, 'enemyTowel', playedHand.myTowel);
		logic.savePlayedHandToHistory(game[enemy].playedHands, 'enemyTowelTarget', playedHand.myTowelTarget);
		logic.savePlayedHandToHistory(game[enemy].playedHands, 'enemyHandName', playedHand.myHandName);
		
		if (app.gameId === playedHand.gameId) {
			if (playedHand.username === app.player2Name) {
				// save hand if it is from my opponent to me (this is also when I am a spectator and the hand is from player 2)
				logic.savePlayedHandToHistory(app.playedHands, 'enemyTowel', playedHand.myTowel);
				logic.savePlayedHandToHistory(app.playedHands, 'enemyTowelTarget', playedHand.myTowelTarget);
				logic.savePlayedHandToHistory(app.playedHands, 'enemyHandName', playedHand.myHandName);
			} else if (!app.thisUserIsPlaying) {
				// or if I am a spectator of the match (and the hand is from player 1)
				logic.savePlayedHandToHistory(app.playedHands, 'myTowel', playedHand.myTowel);
				logic.savePlayedHandToHistory(app.playedHands, 'myTowelTarget', playedHand.myTowelTarget);
				logic.savePlayedHandToHistory(app.playedHands, 'myHandName', playedHand.myHandName);
			}
		}
		
		if (playedHand.myTowel && app.thisUserIsPlaying) {
			// reset my towel
			app.$el.querySelector('.myside .spelldeck').appendChild(app.$el.querySelector('.myside .towel'));
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
	
	socket.on('tournamentCreated', function(tournament) {
		log('tournamentCreated: ' + JSON.stringify(tournament), socket);
		Vue.set(app.tournaments, tournament.id, tournament);
		
		if (tournament.admin === app.username) {
			// the creator / admin is one of the players
			app.tournamentId = tournament.id;
		} else if (app.tournamentId === '') {
			// I am not an admin and am not in a tournament yet, challenge me
			app.tournamentChallengeId = tournament.id;
		}
	});
	
	socket.on('joinedTournament', function(tournamentAndUserName) {
		log('joinedTournament: ' + JSON.stringify(tournamentAndUserName), socket);
		app.tournaments[tournamentAndUserName.tournamentId].players.push(tournamentAndUserName.username);
	});
	
	socket.on('tournamentStarted', function(tournament) {
		log('tournamentStarted: ' + JSON.stringify(tournament), socket);
		Vue.set(app.tournaments, tournament.id, tournament);
	});
	
	socket.on('tournamentWon', function(tournamentId, winner) {
		log('tournamentWon: ' + tournamentId + ', winner: ' + winner, socket);
		app.tournaments[tournamentId].winner = winner;
		app.ui.messageToUser = winner + ' has won the tournament ' + app.tournaments[tournamentId].name + '!!!111 :D';
	});
	
	socket.on('tournamentEnded', function(tournamentId) {
		log('tournamentEnded: ' + tournamentId, socket);
		
		if (app.tournamentId === tournamentId) {
			app.tournamentId = '';
		}
		
		Vue.delete(app.tournaments, tournamentId);
	});
	
	socket.on('challengeRejected', function(username) {
		app.ui.playerChallenged = '';
		app.ui.messageToUser = username + ' has rejected your challenge :(';
	});
	
	socket.on('chatMessage', function(chatMessage) {
		if(app.ui.playerUI !== 'flamebox'){
			app.newMessages++;
			soundEffects.newMessage.play();
		}
		
		app.chatMessages.push(chatMessage);
	});
	
	socket.on('gameStarted', function(gameJson) {
		log('gameStarted: ' + gameJson, socket);
		var game = JSON.parse(gameJson);
		
		// add to the list of games to watch
		Vue.set(app.games, game.id, game);
		
		if (app.username === game.player1.username || app.username === game.player2.username) {
			// I am one of the players, switch my channel to the match
			app.gameId = game.id;
			
			// and clear any challenges I have remaining
			app.ui.playerChallenged = '';
			
			// randomly pick from available towels
			logic.repos.initialTowels.splice(0);
			for(var i = 0; i < logic.staticData.initialTowelAmount; i++) {
				var randomTowel = pickRandomProperty(logic.staticData.towelPrototypes);
				logic.repos.initialTowels.push(randomTowel);
			}
			
			// and let server know that
			var towelsJson = JSON.stringify({
				gameId: app.gameId,
				towels: logic.repos.initialTowels
			});
			socket.emit('towelsChosen', towelsJson);
		}
	});
	
	socket.on('surrender', function(username) {
		log('surrender by: ' + username, socket);
		
		var game;
		for (var gameId in app.games) {
			game = app.games[gameId];
			
			if (game.player1.username === username) {
				break;
			} else if (game.player2.username === username) {
				break;
			}
		}
		
		game.surrendered = username;
		
		if (app.gameId == game.id) {
			app.surrendered = username;
		}
	});
	
	socket.on('gameEnded', function(gameId, winner) {
		log('gameEnded: ' + gameId + ', winner: ' + winner, socket);
		
		if (app.tournamentId !== '') {
			// move winner and maybe also loser along in the bracket of the tournament, unless the ended game is the finals
			var match = tournamentLogic.findMatchByActualPlayerNames(app.tournaments[app.tournamentId].bracket, app.games[gameId].player1.username, app.games[gameId].player2.username);
			tournamentLogic.moveAlongBracket(app.tournaments[app.tournamentId], match.id, winner);
		}
		
		Vue.delete(app.games, gameId);
		
		if (app.gameId == gameId) {
			app.clearGameData();
		}
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