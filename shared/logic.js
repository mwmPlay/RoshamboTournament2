// special IIFE to handle both the node environment and the browser and give the same result
(function(exports){
	exports.staticData = {
		initialTowelAmount: 3,
		handPrototypes: {
			rock: {
				name: 'rock',
				health: 7,
				freeze: 0,
				appearance: 'none',
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
				appearance: 'none',
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
				appearance: 'none',
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
				appearance: 'none',
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
				appearance: 'none',
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
				description: "This towel does 1 damage to any enemy hand it is thrown at.",
				emblemIcon: "fab fa-hotjar",
				descriptionInAction: "to receive one extra damage.",
				dropOnEnemy: true,
				doAction: function(resultOfActions, my, enemy) {
					resultOfActions[my].damageToMyTarget = 1;
				}
			},
			unfathomabledarkness: {
				name: 'unfathomabledarkness',
				title: 'Towel of unfathomable darkness',
				description: "This towel freezes an enemy hand for three rounds.",
				emblemIcon: "fas fa-adjust",
				descriptionInAction: "to be frozen for three rounds.",
				dropOnEnemy: true,
				doAction: function(resultOfActions, my, enemy) {
					// each round 2 freeze drops off, so 4 freeze is needed for 2 rounds
					resultOfActions[my].freezeToMyTarget = 4;
				}
			},
			disproportionatebludgeoning: {
				name: 'disproportionatebludgeoning',
				title: 'Towel of disproportionate bludgeoning',
				description: "This towel makes your hand do 3 extra damage. This only works when your hand does at least 1 damage by itself.",
				emblemIcon: "fas fa-stop",
				descriptionInAction: "to do 3 extra damage.",
				dropOnEnemy: false,
				doAction: function(resultOfActions, my, enemy) {
					// 2 dmg to enemy, but only if the player did damage to the enemy
					if (resultOfActions[my].damageToEnemy > 0) {
						resultOfActions[my].damageToEnemy += 3;
					}
				}
			},
			magnificentalleviation: {
				name: 'magnificentalleviation',
				title: 'Towel of magnificent alleviation',
				description: "This towel heals any card it is used on by 2 HP. Hands can't have more HP than what they started with.",
				emblemIcon: "fas fa-heart",
				descriptionInAction: "to be healed by 2 HP.",
				dropOnEnemy: false,
				doAction: function(resultOfActions, my, enemy) {
					// +2 health
					resultOfActions[my].healingToMyTarget = 2;
				}
			}
		}
	};
	
	exports.repos = {
		initialTowels: []
	};
	
	// clone any object, severing all references within
	exports.clone = function(object) {
		return JSON.parse(JSON.stringify(object));
	};
	
	exports.savePlayedHandToHistory = function(playedHands, key, value) {
		if (playedHands.length === 0 || (playedHands[playedHands.length - 1].myHandName !== '' && playedHands[playedHands.length - 1].enemyHandName !== '')) {
			playedHands.push({
				myHandName: '',
				enemyHandName: '',
				enemyHasChosen: false,
				myTowel: '',
				myTowelTarget: '',
				enemyTowel: '',
				enemyTowelTarget: ''
			});
		}
		
		playedHands[playedHands.length - 1][key] = value;
	};
	
	exports.surrender = function(player) {
		// discard all hands and towels
		player.hands.splice(0);
		player.towels.splice(0);
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
	
	exports.validateUsername = function(username) {
		return username && username.length <= 20;
	};
	
	exports.freezeAndDefrostHands = function(hands, playedHandName) {
		hands.forEach(function(hand) {
			if (hand.name === playedHandName) {
				// add 1 freeze to the played hand
				hand.freeze++;

				if(hand.freeze === 2) hand.freeze = 4;
			} else if (hand.name !== playedHandName && hand.freeze > 1) {
				// subtract 2 freeze from hands that weren't played, unless they are at 1 freeze
				hand.freeze -= 2;
			}
		});
	};
	
	exports.addMockTowels = function(towels) {
		for (var i = 0; i < this.staticData.initialTowelAmount; i++) {
			towels.push({
				name: 'unknown',
				title: 'Unknown towel',
				description: "This towel's identity is secret.",
				emblemIcon: "fas fa-question"
			});
		}
	};
}(typeof exports === 'undefined' ? this.logic = {} : exports));