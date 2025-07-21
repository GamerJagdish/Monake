// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MonakeLeaderboard {
    address public owner;
    uint256 public entryFee = 0.01 ether; // 0.01 MON

    struct PlayerStats {
        uint256 score;
        uint256 timestamp; // To track when the score was submitted
        bool hasPaidEntryFee; // Tracks if fee paid for the current day
        string name;   // Add this
        uint256 fid;   // And this
    }

    // Mapping from player address to their stats for the current day
    mapping(address => PlayerStats) public dailyPlayerStats;
    // Mapping from day (e.g., Unix timestamp of 00:00 UTC) to the list of players who paid that day
    mapping(uint256 => address[]) public dailyParticipants;
    // Mapping from day to the highest score achieved that day
    mapping(uint256 => uint256) public dailyHighestScore;
    // Mapping from day to the winner of that day
    mapping(uint256 => address) public dailyWinner;
    // Mapping from day to the total prize pool for that day
    mapping(uint256 => uint256) public dailyPrizePool;
    // Mapping for player all-time high scores
    mapping(address => uint256) public playerAllTimeHighScore;
    address public signer;
    // Mapping from day to the actual prize awarded (for history)
    mapping(uint256 => uint256) public dailyPrizeAwarded;

    mapping(address => string) public playerName;
    mapping(address => uint256) public playerFID;

    uint256 public currentDayTimestamp; // Timestamp for the start of the current day (00:00 UTC)

    event EntryFeePaid(address indexed player, uint256 amount, uint256 day);
    event ScoreSubmitted(address indexed player, uint256 score, uint256 day);
    event WinnerDeclared(address indexed winner, uint256 prizeAmount, uint256 day);
    event PrizePoolReset(uint256 oldDay, uint256 newDay); // oldDay is the day that ended, newDay is the current day
    event AllTimeHighScoreUpdated(address indexed player, uint256 newAllTimeHighScore);
    event SignerChanged(address indexed newSigner);
    event PrizePoolIncreased(uint256 day, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier feePaidForToday(address player) {
        require(dailyPlayerStats[player].hasPaidEntryFee && getDayTimestamp(block.timestamp) == getDayTimestamp(dailyPlayerStats[player].timestamp), "Entry fee not paid for today");
        _;
    }

    constructor() {
        owner = msg.sender;
        currentDayTimestamp = getDayTimestamp(block.timestamp);
        signer = msg.sender; // Default signer is owner, should be set to backend
    }

    function getDayTimestamp(uint256 timestamp) internal pure returns (uint256) {
        return timestamp - (timestamp % 1 days);
    }

    function _tryDeclareWinnerAndDistributePrize(uint256 dayToProcess) internal {
        // This function is called automatically when the day changes.
        // It attempts to distribute the prize. If it fails (e.g. out of gas, winner reverts),
        // the prize remains and can be distributed manually via declareWinnerAndDistributePrize.

        if (dailyPrizePool[dayToProcess] > 0 && dailyWinner[dayToProcess] != address(0)) {
            address winner = dailyWinner[dayToProcess];
            uint256 prizeAmount = dailyPrizePool[dayToProcess];

            // Temporarily set prize pool to 0 to prevent re-entrancy during the call.
            dailyPrizePool[dayToProcess] = 0;

            (bool success, ) = winner.call{value: prizeAmount}("");

            if (success) {
                emit WinnerDeclared(winner, prizeAmount, dayToProcess);
            } else {
                // If transfer fails, restore the prize pool amount so it can be tried again manually.
                dailyPrizePool[dayToProcess] = prizeAmount;
                // Optionally, emit an event indicating automatic distribution failure:
                // emit AutoDistributionFailed(winner, prizeAmount, dayToProcess, "Transfer failed");
            }
        }
    }

    function updateCurrentDayIfNeeded() internal {
        uint256 today = getDayTimestamp(block.timestamp);
        if (today > currentDayTimestamp) {
            uint256 previousDay = currentDayTimestamp;
            _tryDeclareWinnerAndDistributePrize(previousDay); // Attempt to pay out previous day's winner

            currentDayTimestamp = today;
            // The PrizePoolReset event now clearly indicates the transition
            // 'previousDay' is the day that ended, 'today' is the new current day.
            emit PrizePoolReset(previousDay, today);
        }
    }

    function payEntryFee(bytes calldata signature) external payable {
        updateCurrentDayIfNeeded();
        require(msg.value == entryFee, "Incorrect entry fee amount");
        require(verifySignature(msg.sender, currentDayTimestamp, signature), "Invalid signature");
        
        uint256 today = currentDayTimestamp;
        PlayerStats storage playerStats = dailyPlayerStats[msg.sender];

        // If player already paid for today (e.g. re-entry not allowed or handled differently)
        // For this version, we assume one payment per day marks them as paid.
        if (playerStats.hasPaidEntryFee && getDayTimestamp(playerStats.timestamp) == today) {
            revert("Already paid entry fee for today");
        }

        playerStats.hasPaidEntryFee = true;
        playerStats.timestamp = block.timestamp; // Mark payment time
        playerStats.score = 0; // Reset score for the new day if they are paying again

        dailyParticipants[today].push(msg.sender);
        dailyPrizePool[today] += msg.value;

        emit EntryFeePaid(msg.sender, msg.value, today);
    }

    function submitScore(uint256 score, bytes calldata signature) external feePaidForToday(msg.sender) {
        updateCurrentDayIfNeeded();
        require(verifySignature(msg.sender, currentDayTimestamp, signature), "Invalid signature");
        uint256 today = currentDayTimestamp;
        PlayerStats storage playerStats = dailyPlayerStats[msg.sender];

        // Ensure score is submitted for the current day for which fee was paid
        require(getDayTimestamp(playerStats.timestamp) == today, "Fee paid for a different day");

        if (score > playerStats.score) {
            playerStats.score = score;
            playerStats.timestamp = block.timestamp; // Update timestamp to score submission time

            // Emit the event since a new personal best score for the day is submitted
            emit ScoreSubmitted(msg.sender, score, today);

            // Update player's all-time high score if this score is higher
            if (score > playerAllTimeHighScore[msg.sender]) {
                playerAllTimeHighScore[msg.sender] = score;
                emit AllTimeHighScoreUpdated(msg.sender, score);
            }

            // Update daily highest score and winner if this new score is higher
            if (score > dailyHighestScore[today]) {
                dailyHighestScore[today] = score;
                dailyWinner[today] = msg.sender; // Set the current highest scorer as the winner
            } else if (score == dailyHighestScore[today]) {
                // Optional: Handle ties. If multiple people get the same highest score,
                // this logic makes the last one to submit it the winner.
                // If a different tie-breaking rule is needed (e.g., first to score), this part would change.
                dailyWinner[today] = msg.sender; // Update winner if score matches current highest (last person wins tie)
            }
        }
    }

    // Function to be called (ideally by a keeper or owner) after a day ends
    function declareWinnerAndDistributePrize(uint256 dayToProcess) external onlyOwner {
        require(block.timestamp > dayToProcess + 1 days, "Day not yet over or already processed in future");
        // Ensure this day hasn't been processed for payout yet. A simple check could be if prize pool is > 0.
        // A more robust check would be a separate mapping: mapping(uint256 => bool) public isDayProcessedForPayout;
        // require(!isDayProcessedForPayout[dayToProcess], "Day already processed for payout");
        require(dailyPrizePool[dayToProcess] > 0, "No prize pool for this day or already paid out");
        require(dailyWinner[dayToProcess] != address(0), "No winner recorded for this day");

        address winner = dailyWinner[dayToProcess];
        uint256 prizeAmount = dailyPrizePool[dayToProcess];

        // Clear the prize pool for that day before sending to prevent re-entrancy issues with the transfer
        dailyPrizePool[dayToProcess] = 0;
        dailyPrizeAwarded[dayToProcess] = prizeAmount; // Record awarded prize
        // isDayProcessedForPayout[dayToProcess] = true; // Mark as processed

        (bool success, ) = winner.call{value: prizeAmount}("");
        require(success, "Prize transfer failed");

        emit WinnerDeclared(winner, prizeAmount, dayToProcess);
        
        // Player's 'hasPaidEntryFee' and 'score' for a *new* day are handled when they call `payEntryFee` for that new day.
        // No explicit reset of all player stats is needed here if `dailyPlayerStats` is meant to be their current/latest status.
        // The key is that `payEntryFee` correctly resets/initializes stats for the *new* day they are paying for.
    }

    // Helper function to check if a player has paid for the current day
    function hasPlayerPaidToday(address player) external view returns (bool) {
        uint256 today = getDayTimestamp(block.timestamp);
        // Check if they paid and if the payment was for the current active day of the contract
        return dailyPlayerStats[player].hasPaidEntryFee && getDayTimestamp(dailyPlayerStats[player].timestamp) == today;
    }

    function getPlayerScore(address player) external view returns (uint256) {
        uint256 today = getDayTimestamp(block.timestamp);
        if (getDayTimestamp(dailyPlayerStats[player].timestamp) == today) {
            return dailyPlayerStats[player].score;
        }
        return 0; // Return 0 if no score for today or not paid for today
    }

    function getCurrentPrizePool() external view returns (uint256) {
        return dailyPrizePool[currentDayTimestamp];
    }

    function getHighestScoreToday() external view returns (uint256) {
        return dailyHighestScore[currentDayTimestamp];
    }

    function getPlayerAllTimeHighScore(address player) external view returns (uint256) {
        return playerAllTimeHighScore[player];
    }

    function getDailyParticipantsList(uint256 day) external view returns (address[] memory) {
        return dailyParticipants[day];
    }

    function getPlayerScoreForDay(address player, uint256 day) external view returns (uint256) {
        // Check if the player's recorded stats correspond to the requested day
        // and if they had paid the entry fee for that day.
        // dailyPlayerStats[player].timestamp is the timestamp of the last action (payment or score submission)
        // that confirmed their participation for a specific day.
        if (dailyPlayerStats[player].hasPaidEntryFee && 
            getDayTimestamp(dailyPlayerStats[player].timestamp) == day) {
            return dailyPlayerStats[player].score;
        }
        return 0; // Return 0 if no score for that day or fee not paid for that day
    }

    // Fallback function to receive Ether (e.g., if someone sends MON directly)
    receive() external payable {
        // Optionally, add to prize pool or handle as direct donation
        // For simplicity, let's add to current day's prize pool if entryFee logic is bypassed
        // updateCurrentDayIfNeeded();
        // dailyPrizePool[currentDayTimestamp] += msg.value;
    }

    // Function to allow owner to withdraw any accidental funds not part of prize pools (e.g. from receive() if not handled)
    // Or to withdraw funds if a prize cannot be awarded for some reason (requires careful logic)
    function withdrawStuckFunds(address payable to) external onlyOwner {
        // This is a sensitive function and should be used with extreme caution.
        // It's intended for recovering funds that are not allocated to any prize pool.
        // A more robust contract would have clearer accounting for all ETH received.
        // uint256 balance = address(this).balance; // Commented out unused variable
        // Subtract all known prize pools to find truly 'stuck' funds.
        // This is complex if prize pools span many days and are not yet paid out.
        // For simplicity, this example doesn't implement a full sweep of all dailyPrizePools.
        // require(balance > totalAllocatedPrizes, "No stuck funds to withdraw");
        // (bool success, ) = to.call{value: balance - totalAllocatedPrizes}("");
        // require(success, "Withdrawal failed");
        // This is a simplified version:
        (bool success, ) = to.call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }

    function setEntryFee(uint256 _newFee) external onlyOwner {
        entryFee = _newFee;
    }

    function setSigner(address _signer) external onlyOwner {
        signer = _signer;
        emit SignerChanged(_signer);
    }

    function setPlayerIdentity(string calldata name, uint256 fid) external {
        playerName[msg.sender] = name;
        playerFID[msg.sender] = fid;
    }

    // Helper to verify signature (user, day, signature)
    function verifySignature(address user, uint256 day, bytes calldata signature) public view returns (bool) {
        bytes32 message = keccak256(abi.encodePacked(user, day));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message));
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        address recovered = ecrecover(ethSignedMessageHash, v, r, s);
        return recovered == signer;
    }

    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    // View function to get winner and prize for a given day
    function getWinnerAndPrize(uint256 day) external view returns (address winner, uint256 prize) {
        winner = dailyWinner[day];
        prize = dailyPrizeAwarded[day];
    }

    // Function to allow anyone to increase the current day's prize pool
    function addToPrizePool() external payable {
        require(msg.value > 0, "No ETH sent");
        updateCurrentDayIfNeeded();
        dailyPrizePool[currentDayTimestamp] += msg.value;
        emit PrizePoolIncreased(currentDayTimestamp, msg.value);
    }
}