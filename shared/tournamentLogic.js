// special IIFE to handle both the node environment and the browser and give the same result
(function(exports) {
	exports.generateBracket = function(numPlayers) {
		var result = [];
		var previousWinners = [];
		var matchId = 0;
		
		// all players are winners for now, as they have qualified somehow
		for (i = 1; i <= numPlayers; i++) {
			previousWinners.push(i.toString());
		}
		
		// do some looping until we have a winner
		while (previousWinners.length > 1) {
			var currentWinners = [];
			
			// what round are we in? 2 = 1; 3, 4 = 2; 5, 6, 7, 8 = 4
			var matchRoundType = previousWinners.length > 1 ? largestPowerOf2Below(previousWinners.length - 1) : 1;
			var matchesThisRound = previousWinners.length - matchRoundType;
			
			for (j = 0; j < matchesThisRound; j++) {
				matchId++;
				
				var match = {
					id: matchId,
					roundType: matchRoundType,
					player1: '',
					player2: '',
					player1Name: '',
					player2Name: ''
				};
				
				// every match has 2 players
				match.player1 = previousWinners.shift();
				match.player2 = previousWinners.shift();
				
				// and 1 winner
				currentWinners.push('winner_' + matchId);
				result.push(match);
			}
			
			// any winners that didn't get to play are still winners: they get a bye this round and are inserted at the odd positins
			for (j = 0; j < previousWinners.length; j++) {
				currentWinners.splice((j * 2) + 1, 0, previousWinners[j]);
			}
			
			// end of round, the current winners now are previous winners
			previousWinners = clone(currentWinners);
		}
		
		return result;
	};
	
	// which matches start the tournament?
	exports.getStartingMatches = function(bracket) {
		// first games are those with no winners in them, so first char of both players is not a 'w'
		return bracket.filter(match => {
			return !matchPlayer1IsWinner(match) && !matchPlayer2IsWinner(match);
		});
	};
	
	// return the first match where the players' names match the supplied names
	exports.findMatchByActualPlayerNames = function(bracket, playerName1, playerName2) {
		return bracket.find(match => {
			return (match.player1Name === playerName1 && match.player2Name === playerName2)
				|| (match.player1Name === playerName2 && match.player2Name === playerName1);
		});
	};
	
	// move the winner along the bracket, if both players of the next match are known, then return it
	exports.moveAlongBracket = function(bracket, matchId, winner, players) {
		var nextMatch = bracket.find(match => {
			return match.player1 === 'winner_' + matchId || match.player2 === 'winner_' + matchId;;
		});
		
		if (nextMatch) {
			// try to get player 1
			if (!matchPlayer1IsWinner(nextMatch)) {
				// seeded player, get it
				nextMatch.player1Name = players[nextMatch.player1 - 1];
			} else if (match.player1 === 'winner_' + matchId) {
				nextMatch.player1Name = winner;
			}
			
			// try to get player 2
			if (!matchPlayer2IsWinner(nextMatch)) {
				// seeded player, get it
				nextMatch.player2Name = players[nextMatch.player2 - 1];
			} else if (match.player2 === 'winner_' + matchId) {
				nextMatch.player2Name = winner;
			}
			
			if (nextMatch.player1Name && nextMatch.player2Name) {
				// match can be played, return it
				return nextMatch;
			}
		}
		
		return null;
	}
	
	function matchPlayer1IsWinner(match) {
		return match.player1.charAt(0) === 'w';
	}
	
	function matchPlayer2IsWinner(match) {
		return match.player2.charAt(0) === 'w';
	}
	
	function clone(object) {
		return JSON.parse(JSON.stringify(object));
	}
	
	function largestPowerOf2Below(number) {
		return Math.pow(2, Math.floor(Math.log(number) / Math.log(2))); 
	}
}(typeof exports === 'undefined' ? this.tournamentLogic = {} : exports));