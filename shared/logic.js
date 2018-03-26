// special IIFE to handle both the node environment and the browser and give the same result
(function(exports){
	exports.handPrototypes = {
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
	}
}(typeof exports === 'undefined' ? this.logic = {} : exports));