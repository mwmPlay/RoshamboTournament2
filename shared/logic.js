// special IIFE to handle both the node environment and the browser and give the same result
(function(exports){
	exports.staticData = {
		initialTowelAmount: 3,
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
		},
		towelPrototypes: {
			impendingdoom: {
				name: 'impendingdoom',
				title: 'Towel of impending doom',
				description: "This towel's fabric is so irritating that it does 3 damage to any hand it's thrown at.",
				emblemIcon: "fab fa-hotjar",
				dropOnEnemy: true,
				doAction: function(resultOfActions, thisPlayer, otherPlayer) {
					resultOfActions[thisPlayer].damageToMyTarget = 3;
				}
			},
			unfathomabledarkness: {
				name: 'unfathomabledarkness',
				title: 'Towel of unfathomable darkness',
				description: "This towel wraps around an enemy hand and thus renders it useless for 2 rounds.",
				emblemIcon: "fas fa-adjust",
				dropOnEnemy: true,
				doAction: function(resultOfActions, thisPlayer, otherPlayer) {
					// each round 2 freeze drops off, so 4 freeze is needed for 2 rounds
					resultOfActions[thisPlayer].freezeToMyTarget = 4;
				}
			},
			disproportionatebludgeoning: {
				name: 'disproportionatebludgeoning',
				title: 'Towel of disproportionate bludgeoning',
				description: "This towel is so heavy that when wrapped around a hand it deals extra damage.",
				emblemIcon: "fas fa-stop",
				dropOnEnemy: false,
				doAction: function(resultOfActions, thisPlayer, otherPlayer) {
					// 2 dmg to other, but only if the player did damage to the other
					if (resultOfActions[thisPlayer].damageToOther > 0) {
						resultOfActions[thisPlayer].damageToOther += 2;
					}
				}
			},
			magnificentalleviation: {
				name: 'magnificentalleviation',
				title: 'Towel of magnificent alleviation',
				description: "This towel had aloe vera spilled on it and now it has healing properties.",
				emblemIcon: "fas fa-heart",
				dropOnEnemy: false,
				doAction: function(resultOfActions, thisPlayer, otherPlayer) {
					// +2 health
					resultOfActions[thisPlayer].healingToMyTarget = 2;
				}
			}
		}
	};
	
	exports.repos = {
		initialTowels: []
	};
	
	exports.savePlayedHandToHistory = function(playedHands, key, value) {
		if (playedHands.length === 0 || (playedHands[playedHands.length - 1].myHandName !== '' && playedHands[playedHands.length - 1].otherHandName !== '')) {
			playedHands.push({
				myHandName: '',
				otherHandName: '',
				otherHasChosen: false,
				myTowel: '',
				myTowelTarget: '',
				otherTowel: '',
				otherTowelTarget: ''
			});
		}
		
		playedHands[playedHands.length - 1][key] = value;
	};
	
	exports.savePlayerNamesToSession = function(session, player1Name, player2Name) {
		if (session.username === player2Name) {
			// player 2 sees things upside down
			session.player1Name = player2Name;
			session.player2Name = player1Name;
		} else {
			// everyone else sees the same as player 1
			session.player1Name = player1Name;
			session.player2Name = player2Name;
		}
	};
	
	exports.removeFromOtherUsers = function(otherUsers, username) {
		var otherUserIndex = otherUsers.findIndex(function(otherUser) {
			return otherUser.name === username;
		});
		
		if (otherUserIndex > -1) {
			otherUsers.splice(otherUserIndex, 1);
		}
	};
	
	exports.clearSession = function(session) {
		session.playedHands.splice(0);
		session.towels.splice(0);
		session.player1Name = '';
		session.player2Name = '';
	};
	
	exports.validateUsername = function(username) {
		return username && username.length <= 20;
	};
	
	exports.freezeAndDefrostHands = function(hands, playedHandName) {
		hands.forEach(function(hand) {
			if (hand.name === playedHandName) {
				// add 1 freeze to the played hand
				hand.freeze++;
			} else if (hand.name !== playedHandName && hand.freeze > 1) {
				// subtract 2 freeze from hands that weren't played, unless they are at 1 freeze
				hand.freeze -= 2;
			}
		});
	}
}(typeof exports === 'undefined' ? this.logic = {} : exports));