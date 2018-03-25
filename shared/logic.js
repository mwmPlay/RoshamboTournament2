// special IIFE to handle both the node environment and the browser and give the same result
(function(exports){
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