pragma solidity ^0.4.24;

// Players can vote to kick people off the game. Votes are not visible until voting is done
// At the end of each round the highest voted player is kicked off.
// Game lasts until only one player is standing
contract Game_blind_vote {
    struct Player {
        bool is_playing;    // Set when player state is initialized
        bytes32 vote_hash; // keccak256.abi.encodePacked(address_of_voted_player, secret))
        uint votes_for; // Number of votes aimed at this player
    }

    enum State { VOTING, CONFIRMING }

    State internal m_state;

    address public m_owner;
    
    // Maps private player info to the address
    mapping(address => Player) public m_players;

    // List of all players with no repeats
    address[] public m_addresses;

    // Number of players who have voted this round
    uint public m_voted_player_count;
    uint public m_confirmed_voter_count;

    event eliminated(address player, uint votes);
    event game_end(address winner);

    // Validate the player list before game even starts
    modifier validate_address_list(address[] addresses){
        require(addresses.length >= 2, "Not enough players");
        _;
    }

    modifier is_owner(){
        require(msg.sender == m_owner, "You are not the owner of this game");
        _;
    }

    modifier is_player() {
        require(m_players[msg.sender].is_playing, "You are not a player in this game");
        _;
    }

    modifier is_in_state(State state){
        require(m_state == state, "Action disallowed by current game state");
        _;
    }

    modifier vote_matches_hash(address target, bytes32 secret){
        bytes32 hash = keccak256(abi.encodePacked(target, secret));
        require(
            m_players[msg.sender].vote_hash == hash,
            "Vote confirmation info does not match previously send data"
        );
        _;
    }

    modifier last_man_standing(){
        if (player_count() == 1){
            _;
        }
    }

    constructor(address[] addresses) validate_address_list(addresses) public {
        m_owner = msg.sender;
        for (uint i = 0; i < addresses.length; i++){
            address addr = addresses[i];
            // Check if this same address was registered earlier
            require(addr != address(0), "No null addresses.");
            require(!m_players[addr].is_playing, "All players should have unique addresses.");

            m_addresses.push(addr);
            m_players[addr] = Player({
                is_playing: true,
                vote_hash: 0,
                votes_for: 0
            });
        }
    }

    function player_count() public view returns(uint) {
        return m_addresses.length;
    }

    // Allows a player to send in or change their vote hash
    function vote(bytes32 vote_hash) public is_player is_in_state(State.VOTING) {
        // Only increase count of voted players if the sender has not yet voted
        if (player.vote_hash == 0){
            m_voted_player_count++;
        }

        Player storage player = m_players[msg.sender];
        player.vote_hash = vote_hash;

        // Once all players have voted, start confirming votes
        if (m_voted_player_count == player_count()){
            m_state = State.CONFIRMING;
        }
    }

    // Owner can force the game into the confirming stage
    function force_finish_voting() public is_owner is_in_state(State.VOTING) {
        m_state = State.CONFIRMING;
    }

    // Confirm the user's vote and enact its results
    function confirm(address target, bytes32 secret) 
        public
        is_player 
        is_in_state(State.CONFIRMING) 
        vote_matches_hash(target, secret)
    {
        m_players[target].votes_for++;
        // Make it so the same player can't confirm their vote twice in the same round
        m_players[msg.sender].vote_hash = bytes32(0);
        m_confirmed_voter_count++;

        if (m_confirmed_voter_count == player_count()){
            finish_round();
        }
    }

    // Owner can force the game to finish confirming and end the round
    function force_finish_confirming() public is_owner is_in_state(State.CONFIRMING) {
        finish_round();
    }

    // Apply the player elimination logic at the end of a round
    function finish_round() internal {
        (uint idx, bool tie) = count_votes();
        apply_results(idx, tie);
        reset();
    }

    // Returns index of highest voted player and whether there was a tie
    function count_votes() internal view returns(uint, bool) {
        uint highest_votes;
        uint highest_player_idx;
        bool tie = true;
        for (uint i = 0; i < player_count(); i++){
            address addr = m_addresses[i];
            uint votes = m_players[addr].votes_for;
            if (votes > highest_votes){
                highest_votes = votes;
                highest_player_idx = i;
                tie = false;
            }
            else if (votes == highest_votes){
                tie = true;
            }
        }
        return (highest_player_idx, tie);
    }

    // Apply results of the vote counting to the players
    function apply_results(uint idx, bool tie) internal {
        // In this case. the highest voted player is removed if the votes are not ties
        if (!tie) remove_player(idx);
        crown_last_man();
    }

    // Remove player at the specified index. Causes some reordering of the array
    function remove_player(uint idx) internal {
        assert(player_count() > 1); // Otherwise the below code doesn't work
        emit eliminated(m_addresses[idx], m_players[m_addresses[idx]].votes_for);
        // Remove player from the mapping
        delete m_players[m_addresses[idx]];
        // Remove player from the array
        address temp = m_addresses[player_count() - 1];
        m_addresses.length--;
        if (idx < player_count()) m_addresses[idx] = temp;
    }

    // If there's only one player left make them the winner and end game
    function crown_last_man() internal last_man_standing {
        address winner = m_addresses[0];
        emit game_end(winner);
        selfdestruct(winner);
    }

    // Reset all state variables to the default before starting a new round
    function reset() internal {
        m_state = State.VOTING;
        m_voted_player_count = 0;
        m_confirmed_voter_count = 0;

        for (uint i = 0; i < player_count(); i++){
            Player storage player = m_players[m_addresses[i]];
            player.votes_for = 0;
            player.vote_hash = bytes32(0);
        }
    }
}
