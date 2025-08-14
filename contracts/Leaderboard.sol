// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract MonakeLeaderboard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public owner;
    address public gameServer; // Address that signs valid scores
    uint256 public entryFee = 0.01 ether; // 0.01 MON
    uint256 public maxScoreAge = 300; // Max age of score signature in seconds (5 minutes)
    uint256 public houseFeePercent = 0; // House fee percentage (0-5%), default 0%
    uint256 public minPlayersForPrize = 3; // Minimum players needed for prize distribution

    struct PlayerStats {
        uint256 score;
        uint256 timestamp; // To track when the score was submitted
        bool hasPaidEntryFee; // Tracks if fee paid for the current day
        uint256 farcasterID; // Optional Farcaster ID
        string username; // Optional username (max 32 chars)
    }

    struct AllTimeEntry {
        address player;
        uint256 score;
        uint256 farcasterID;
        string username;
        uint256 timestamp; // When they achieved this high score
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
    // Mapping to store all-time high score details
    mapping(address => AllTimeEntry) public playerAllTimeDetails;
    // Mapping to prevent signature replay attacks
    mapping(bytes32 => bool) public usedSignatures;
    // Array to track all players who ever scored (for leaderboard)
    address[] public allTimePlayers;
    // Mapping to check if player is already in allTimePlayers array
    mapping(address => bool) public hasEverScored;

    uint256 public currentDayTimestamp; // Timestamp for the start of the current day (00:00 UTC)

    event EntryFeePaid(address indexed player, uint256 amount, uint256 day, uint256 farcasterID, string username);
    event ScoreSubmitted(address indexed player, uint256 score, uint256 day, uint256 farcasterID, string username);
    event WinnerDeclared(address indexed winner, uint256 prizeAmount, uint256 day);
    event PrizePoolReset(uint256 oldDay, uint256 newDay); // oldDay is the day that ended, newDay is the current day
    event AllTimeHighScoreUpdated(address indexed player, uint256 newAllTimeHighScore);
    event GameServerUpdated(address indexed oldServer, address indexed newServer);
    event PrizesDistributed(uint256 day, uint256 totalPrize, uint256 houseFee, address[] winners, uint256[] amounts);
    event EntryFeesRefunded(uint256 day, uint256 totalRefunded, address[] players);
    event HouseFeeUpdated(uint256 oldFee, uint256 newFee);
    event EmergencyWithdrawal(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier feePaidForToday(address player) {
        require(dailyPlayerStats[player].hasPaidEntryFee && getDayTimestamp(block.timestamp) == getDayTimestamp(dailyPlayerStats[player].timestamp), "Entry fee not paid for today");
        _;
    }

    constructor(address _gameServer) {
        owner = msg.sender;
        gameServer = _gameServer;
        currentDayTimestamp = getDayTimestamp(block.timestamp);
    }

    function getDayTimestamp(uint256 timestamp) internal pure returns (uint256) {
        return timestamp - (timestamp % 1 days);
    }

    function _tryDeclareWinnerAndDistributePrize(uint256 dayToProcess) internal {
        // This function is called automatically when the day changes.
        // It attempts to distribute prizes or refund if insufficient players.

        if (dailyPrizePool[dayToProcess] == 0) {
            return; // Already processed or no prize pool
        }

        // Check if we have minimum players for prize distribution
        if (dailyParticipants[dayToProcess].length < minPlayersForPrize) {
            _tryRefundEntryFees(dayToProcess);
            return;
        }

        // Try to distribute prizes
        _tryDistributePrizes(dayToProcess);
    }

    function _tryRefundEntryFees(uint256 dayToProcess) internal {
        if (dailyPrizePool[dayToProcess] == 0) {
            return; // Already processed
        }

        address[] memory participants = dailyParticipants[dayToProcess];
        uint256 totalRefund = dailyPrizePool[dayToProcess];
        uint256 refundPerPlayer = totalRefund / participants.length;
        
        // Set prize pool to 0 to prevent re-entrancy
        dailyPrizePool[dayToProcess] = 0;

        // Attempt to refund all players
        bool allRefundsSuccessful = true;
        for (uint256 i = 0; i < participants.length; i++) {
            (bool success, ) = participants[i].call{value: refundPerPlayer}("");
            if (!success) {
                allRefundsSuccessful = false;
            }
        }

        if (allRefundsSuccessful) {
            emit EntryFeesRefunded(dayToProcess, totalRefund, participants);
        } else {
            // If any refund failed, restore the prize pool
            dailyPrizePool[dayToProcess] = totalRefund;
        }
    }

    function _tryDistributePrizes(uint256 dayToProcess) internal {
        if (dailyPrizePool[dayToProcess] == 0) {
            return; // Already processed
        }

        uint256 totalPrize = dailyPrizePool[dayToProcess];
        
        // Calculate house fee
        uint256 houseFee = (totalPrize * houseFeePercent) / 100;
        uint256 prizesAfterFee = totalPrize - houseFee;
        
        // Set prize pool to 0 to prevent re-entrancy
        dailyPrizePool[dayToProcess] = 0;

        // Send house fee to owner
        if (houseFee > 0) {
            (bool feeSuccess, ) = owner.call{value: houseFee}("");
            if (!feeSuccess) {
                // If house fee transfer fails, restore prize pool and return
                dailyPrizePool[dayToProcess] = totalPrize;
                return;
            }
        }

        // Get sorted winners and distribute prizes
        (address[] memory winners, uint256[] memory amounts) = _calculatePrizeDistribution(dayToProcess, prizesAfterFee);
        
        // Attempt to send prizes
        bool allTransfersSuccessful = true;
        for (uint256 i = 0; i < winners.length; i++) {
            if (amounts[i] > 0) {
                (bool success, ) = winners[i].call{value: amounts[i]}("");
                if (!success) {
                    allTransfersSuccessful = false;
                }
            }
        }

        if (allTransfersSuccessful) {
            emit PrizesDistributed(dayToProcess, totalPrize, houseFee, winners, amounts);
        } else {
            // If any transfer failed, restore the prize pool
            dailyPrizePool[dayToProcess] = totalPrize;
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

    function payEntryFee(
        uint256 farcasterID,
        string memory username,
        uint256 timestamp,
        bytes memory signature
    ) external payable {
        updateCurrentDayIfNeeded();
        require(msg.value == entryFee, "Incorrect entry fee amount");
        
        // Validate username length
        bytes memory usernameBytes = bytes(username);
        require(usernameBytes.length <= 32, "Username too long (max 32 chars)");
        
        // Verify the signature is not too old
        require(block.timestamp <= timestamp + maxScoreAge, "Payment signature expired");
        require(timestamp <= block.timestamp, "Payment timestamp in future");

        // Create the message hash that should have been signed for entry fee
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender, 
            msg.value, 
            farcasterID, 
            username, 
            timestamp
        ));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();

        // Prevent signature replay attacks
        require(!usedSignatures[ethSignedMessageHash], "Payment signature already used");
        usedSignatures[ethSignedMessageHash] = true;

        // Verify the signature comes from the game server
        address signer = ethSignedMessageHash.recover(signature);
        require(signer == gameServer, "Invalid payment signature - not from authorized game server");
        
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
        playerStats.farcasterID = farcasterID; // Store Farcaster ID (0 if not provided)
        playerStats.username = username; // Store username (empty string if not provided)

        dailyParticipants[today].push(msg.sender);
        dailyPrizePool[today] += msg.value;

        emit EntryFeePaid(msg.sender, msg.value, today, farcasterID, username);
    }

    function submitScore(
        uint256 score,
        uint256 farcasterID,
        string memory username,
        uint256 timestamp,
        bytes memory signature
    ) external feePaidForToday(msg.sender) {
        updateCurrentDayIfNeeded();
        uint256 today = currentDayTimestamp;
        PlayerStats storage playerStats = dailyPlayerStats[msg.sender];

        // Ensure score is submitted for the current day for which fee was paid
        require(getDayTimestamp(playerStats.timestamp) == today, "Fee paid for a different day");

        // Validate username length
        bytes memory usernameBytes = bytes(username);
        require(usernameBytes.length <= 32, "Username too long (max 32 chars)");

        // Verify the signature is not too old
        require(block.timestamp <= timestamp + maxScoreAge, "Score signature expired");
        require(timestamp <= block.timestamp, "Score timestamp in future");

        // Create the message hash that should have been signed
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender, 
            score, 
            farcasterID, 
            username, 
            timestamp
        ));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();

        // Prevent signature replay attacks
        require(!usedSignatures[ethSignedMessageHash], "Signature already used");
        usedSignatures[ethSignedMessageHash] = true;

        // Verify the signature comes from the game server
        address signer = ethSignedMessageHash.recover(signature);
        require(signer == gameServer, "Invalid signature - score not from authorized game server");

        if (score > playerStats.score) {
            playerStats.score = score;
            playerStats.timestamp = block.timestamp; // Update timestamp to score submission time
            playerStats.farcasterID = farcasterID; // Update with latest Farcaster ID
            playerStats.username = username; // Update with latest username

            // Emit the event since a new personal best score for the day is submitted
            emit ScoreSubmitted(msg.sender, score, today, farcasterID, username);

            // Update player's all-time high score if this score is higher
            if (score > playerAllTimeHighScore[msg.sender]) {
                playerAllTimeHighScore[msg.sender] = score;
                
                // Add to all-time players list if not already there
                if (!hasEverScored[msg.sender]) {
                    allTimePlayers.push(msg.sender);
                    hasEverScored[msg.sender] = true;
                }
                
                // Update all-time details (keep timestamp of when they achieved this high score)
                playerAllTimeDetails[msg.sender] = AllTimeEntry({
                    player: msg.sender,
                    score: score,
                    farcasterID: farcasterID,
                    username: username,
                    timestamp: block.timestamp
                });
                
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

    function _calculatePrizeDistribution(uint256 day, uint256 totalPrize) internal view returns (
        address[] memory winners,
        uint256[] memory amounts
    ) {
        address[] memory participants = dailyParticipants[day];
        if (participants.length == 0) {
            return (new address[](0), new uint256[](0));
        }

        // Create array of scores for sorting
        uint256[] memory scores = new uint256[](participants.length);
        for (uint256 idx = 0; idx < participants.length; idx++) {
            PlayerStats memory stats = dailyPlayerStats[participants[idx]];
            if (getDayTimestamp(stats.timestamp) == day) {
                scores[idx] = stats.score;
            }
        }

        // Sort participants by score (descending) - simple bubble sort for now
        for (uint256 idx = 0; idx < participants.length - 1; idx++) {
            for (uint256 j = 0; j < participants.length - idx - 1; j++) {
                if (scores[j] < scores[j + 1]) {
                    // Swap scores
                    uint256 tempScore = scores[j];
                    scores[j] = scores[j + 1];
                    scores[j + 1] = tempScore;
                    
                    // Swap participants
                    address tempAddr = participants[j];
                    participants[j] = participants[j + 1];
                    participants[j + 1] = tempAddr;
                }
            }
        }

        // Group by unique scores and calculate prizes
        winners = new address[](participants.length);
        amounts = new uint256[](participants.length);
        
        uint256 winnerCount = 0;
        uint256 currentTier = 1;
        uint256 i = 0;
        
        while (i < participants.length && currentTier <= 3) {
            uint256 currentScore = scores[i];
            uint256 tiersPlayersCount = 0;
            
            // Count players with same score
            for (uint256 j = i; j < participants.length && scores[j] == currentScore; j++) {
                tiersPlayersCount++;
            }
            
            // Calculate prize for this tier
            uint256 tierPrize = 0;
            if (currentTier == 1) {
                tierPrize = (totalPrize * 70) / 100; // 70% for 1st
            } else if (currentTier == 2) {
                tierPrize = (totalPrize * 20) / 100; // 20% for 2nd
            } else if (currentTier == 3) {
                tierPrize = (totalPrize * 10) / 100; // 10% for 3rd
            }
            
            uint256 prizePerPlayer = tierPrize / tiersPlayersCount;
            
            // Assign prizes to tied players
            for (uint256 k = 0; k < tiersPlayersCount; k++) {
                winners[winnerCount] = participants[i + k];
                amounts[winnerCount] = prizePerPlayer;
                winnerCount++;
            }
            
            i += tiersPlayersCount;
            currentTier++;
        }
        
        // Resize arrays to actual winner count
        address[] memory finalWinners = new address[](winnerCount);
        uint256[] memory finalAmounts = new uint256[](winnerCount);
        
        for (uint256 j = 0; j < winnerCount; j++) {
            finalWinners[j] = winners[j];
            finalAmounts[j] = amounts[j];
        }
        
        return (finalWinners, finalAmounts);
    }

    // Function to be called (ideally by a keeper or owner) after a day ends
    function declareWinnerAndDistributePrize(uint256 dayToProcess) external onlyOwner {
        require(block.timestamp > dayToProcess + 1 days, "Day not yet over");
        require(dailyPrizePool[dayToProcess] > 0, "No prize pool for this day or already paid out");

        // Check if we have minimum players for prize distribution
        if (dailyParticipants[dayToProcess].length < minPlayersForPrize) {
            _refundEntryFees(dayToProcess);
        } else {
            _distributePrizes(dayToProcess);
        }
    }

    function _refundEntryFees(uint256 dayToProcess) internal {
        address[] memory participants = dailyParticipants[dayToProcess];
        uint256 totalRefund = dailyPrizePool[dayToProcess];
        uint256 refundPerPlayer = totalRefund / participants.length;
        
        // Clear the prize pool
        dailyPrizePool[dayToProcess] = 0;

        // Refund all players
        for (uint256 i = 0; i < participants.length; i++) {
            (bool success, ) = participants[i].call{value: refundPerPlayer}("");
            require(success, "Refund transfer failed");
        }

        emit EntryFeesRefunded(dayToProcess, totalRefund, participants);
    }

    function _distributePrizes(uint256 dayToProcess) internal {
        uint256 totalPrize = dailyPrizePool[dayToProcess];
        
        // Calculate house fee
        uint256 houseFee = (totalPrize * houseFeePercent) / 100;
        uint256 prizesAfterFee = totalPrize - houseFee;
        
        // Clear the prize pool
        dailyPrizePool[dayToProcess] = 0;

        // Send house fee to owner
        if (houseFee > 0) {
            (bool feeSuccess, ) = owner.call{value: houseFee}("");
            require(feeSuccess, "House fee transfer failed");
        }

        // Get sorted winners and distribute prizes
        (address[] memory winners, uint256[] memory amounts) = _calculatePrizeDistribution(dayToProcess, prizesAfterFee);
        
        // Send prizes
        for (uint256 i = 0; i < winners.length; i++) {
            if (amounts[i] > 0) {
                (bool success, ) = winners[i].call{value: amounts[i]}("");
                require(success, "Prize transfer failed");
            }
        }

        emit PrizesDistributed(dayToProcess, totalPrize, houseFee, winners, amounts);
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

    // Emergency withdrawal function - only withdraws funds not allocated to prize pools
    function emergencyWithdraw(address payable to, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        
        // Calculate total allocated prize pools (check last 30 days)
        uint256 totalAllocated = 0;
        uint256 today = getDayTimestamp(block.timestamp);
        
        for (uint256 i = 0; i < 30; i++) {
            uint256 day = today - (i * 1 days);
            totalAllocated += dailyPrizePool[day];
        }
        
        uint256 availableBalance = address(this).balance - totalAllocated;
        require(amount <= availableBalance, "Cannot withdraw allocated prize funds");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit EmergencyWithdrawal(to, amount, block.timestamp);
    }

    function setEntryFee(uint256 _newFee) external onlyOwner {
        entryFee = _newFee;
    }

    function setGameServer(address _newGameServer) external onlyOwner {
        require(_newGameServer != address(0), "Invalid game server address");
        address oldServer = gameServer;
        gameServer = _newGameServer;
        emit GameServerUpdated(oldServer, _newGameServer);
    }

    function setMaxScoreAge(uint256 _maxScoreAge) external onlyOwner {
        require(_maxScoreAge > 0, "Max score age must be greater than 0");
        maxScoreAge = _maxScoreAge;
    }

    function setHouseFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 5, "House fee cannot exceed 5%");
        uint256 oldFee = houseFeePercent;
        houseFeePercent = _feePercent;
        emit HouseFeeUpdated(oldFee, _feePercent);
    }

    function setMinPlayersForPrize(uint256 _minPlayers) external onlyOwner {
        require(_minPlayers > 0, "Minimum players must be greater than 0");
        minPlayersForPrize = _minPlayers;
    }

    function isSignatureUsed(bytes32 signatureHash) external view returns (bool) {
        return usedSignatures[signatureHash];
    }

    function getWinnerInfo(uint256 day) external view returns (
        address winner,
        uint256 prizeAmount,
        uint256 winningScore,
        uint256 farcasterID,
        string memory username
    ) {
        winner = dailyWinner[day];
        prizeAmount = dailyPrizePool[day];
        winningScore = dailyHighestScore[day];
        
        if (winner != address(0)) {
            PlayerStats memory winnerStats = dailyPlayerStats[winner];
            // Only return farcaster data if the winner's stats are from the same day
            if (getDayTimestamp(winnerStats.timestamp) == day) {
                farcasterID = winnerStats.farcasterID;
                username = winnerStats.username;
            }
        }
    }

    function getPlayerProfile(address player) external view returns (
        uint256 currentScore,
        uint256 allTimeHighScore,
        uint256 farcasterID,
        string memory username,
        bool hasPaidToday
    ) {
        uint256 today = getDayTimestamp(block.timestamp);
        PlayerStats memory stats = dailyPlayerStats[player];
        
        currentScore = (getDayTimestamp(stats.timestamp) == today) ? stats.score : 0;
        allTimeHighScore = playerAllTimeHighScore[player];
        hasPaidToday = stats.hasPaidEntryFee && getDayTimestamp(stats.timestamp) == today;
        
        // Only return farcaster data if it's from today or recent activity
        if (getDayTimestamp(stats.timestamp) == today) {
            farcasterID = stats.farcasterID;
            username = stats.username;
        }
    }

    function getDailyWinnerHistory(uint256[] memory daysList) external view returns (
        address[] memory winners,
        uint256[] memory prizeAmounts,
        uint256[] memory winningScores,
        uint256[] memory farcasterIDs,
        string[] memory usernames
    ) {
        uint256 length = daysList.length;
        winners = new address[](length);
        prizeAmounts = new uint256[](length);
        winningScores = new uint256[](length);
        farcasterIDs = new uint256[](length);
        usernames = new string[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 day = daysList[i];
            winners[i] = dailyWinner[day];
            prizeAmounts[i] = dailyPrizePool[day];
            winningScores[i] = dailyHighestScore[day];
            
            if (winners[i] != address(0)) {
                PlayerStats memory winnerStats = dailyPlayerStats[winners[i]];
                if (getDayTimestamp(winnerStats.timestamp) == day) {
                    farcasterIDs[i] = winnerStats.farcasterID;
                    usernames[i] = winnerStats.username;
                }
            }
        }
    }

    function getTopAllTimeScores(uint256 limit) external view returns (
        address[] memory players,
        uint256[] memory scores,
        uint256[] memory farcasterIDs,
        string[] memory usernames,
        uint256[] memory timestamps
    ) {
        require(limit > 0 && limit <= 100, "Limit must be between 1 and 100");
        
        uint256 totalPlayers = allTimePlayers.length;
        uint256 returnCount = totalPlayers < limit ? totalPlayers : limit;
        
        // Create arrays for sorting
        address[] memory sortedPlayers = new address[](totalPlayers);
        uint256[] memory sortedScores = new uint256[](totalPlayers);
        
        // Copy data for sorting
        for (uint256 i = 0; i < totalPlayers; i++) {
            sortedPlayers[i] = allTimePlayers[i];
            sortedScores[i] = playerAllTimeHighScore[allTimePlayers[i]];
        }
        
        // Sort by score (descending) - bubble sort
        for (uint256 i = 0; i < totalPlayers - 1; i++) {
            for (uint256 j = 0; j < totalPlayers - i - 1; j++) {
                if (sortedScores[j] < sortedScores[j + 1]) {
                    // Swap scores
                    uint256 tempScore = sortedScores[j];
                    sortedScores[j] = sortedScores[j + 1];
                    sortedScores[j + 1] = tempScore;
                    
                    // Swap players
                    address tempPlayer = sortedPlayers[j];
                    sortedPlayers[j] = sortedPlayers[j + 1];
                    sortedPlayers[j + 1] = tempPlayer;
                }
            }
        }
        
        // Prepare return arrays
        players = new address[](returnCount);
        scores = new uint256[](returnCount);
        farcasterIDs = new uint256[](returnCount);
        usernames = new string[](returnCount);
        timestamps = new uint256[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            players[i] = sortedPlayers[i];
            scores[i] = sortedScores[i];
            
            AllTimeEntry memory entry = playerAllTimeDetails[sortedPlayers[i]];
            farcasterIDs[i] = entry.farcasterID;
            usernames[i] = entry.username;
            timestamps[i] = entry.timestamp;
        }
    }

    function getAllTimeRank(address player) external view returns (uint256 rank) {
        if (!hasEverScored[player]) {
            return 0; // Player never scored
        }
        
        uint256 playerScore = playerAllTimeHighScore[player];
        uint256 betterPlayers = 0;
        
        for (uint256 i = 0; i < allTimePlayers.length; i++) {
            if (playerAllTimeHighScore[allTimePlayers[i]] > playerScore) {
                betterPlayers++;
            }
        }
        
        return betterPlayers + 1; // Rank is 1-based
    }

    function getTotalPlayersCount() external view returns (uint256) {
        return allTimePlayers.length;
    }

    function getAllTimePlayerDetails(address player) external view returns (
        uint256 score,
        uint256 farcasterID,
        string memory username,
        uint256 timestamp,
        uint256 rank
    ) {
        if (!hasEverScored[player]) {
            return (0, 0, "", 0, 0);
        }
        
        AllTimeEntry memory entry = playerAllTimeDetails[player];
        uint256 playerRank = this.getAllTimeRank(player);
        
        return (entry.score, entry.farcasterID, entry.username, entry.timestamp, playerRank);
    }
}