// special IIFE to handle both the node environment and the browser and give the same result
(function(exports){
	exports.savePlayedHandToHistory = function(playedHands, key, value) {
		if (playedHands.length === 0 || (playedHands[playedHands.length - 1].myHandName !== '' && playedHands[playedHands.length - 1].otherHandName !== '')) {
			playedHands.push({
				myHandName: '',
				otherHandName: '',
				otherHasChosen: false
			});
		}
		
		playedHands[playedHands.length - 1][key] = value;
	};
}(typeof exports === 'undefined' ? this.logic = {} : exports));