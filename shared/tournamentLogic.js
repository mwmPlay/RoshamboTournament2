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
					players: [],
					actualPlayers: []
				};
				
				// every match has 2 players
				match.players.push(previousWinners.shift());
				match.players.push(previousWinners.shift());
				
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
			return match.players[0].charAt(0) !== 'w' && match.players[1].charAt(0) !== 'w';
		});
	};
	
	// return the first match where the players' names match the supplied names
	exports.findMatchByActualPlayerNames = function(bracket, playerName1, playerName2) {
		return bracket.find(match => {
			return (match.actualPlayers[0] === playerName1 && match.actualPlayers[1] === playerName2)
				|| (match.actualPlayers[0] === playerName2 && match.actualPlayers[1] === playerName1);
		});
	};
	
	function clone(object) {
		return JSON.parse(JSON.stringify(object));
	}
	
	function largestPowerOf2Below(number) {
		return Math.pow(2, Math.floor(Math.log(number) / Math.log(2))); 
	}
}(typeof exports === 'undefined' ? this.tournamentLogic = {} : exports));