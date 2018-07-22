const Game = artifacts.require('Game_blind_vote');
const expect_throw = require('./utils/expect_throw.js')
const async_init = require('./utils/async_init.js')
const abi = require('ethereumjs-abi')

function test_player_count(msg, count) {
    it(msg, async () => {
        let player_count = await async_init.instance.player_count();
        assert.equal(player_count, count);
    });
}

function test_player_addresses(msg, addr_list) {
    it(msg, async () => {
        for (let i = 0; i < addr_list.length; i++) {
            let addr = await async_init.instance.m_addresses(i);
            assert(addr_list.includes(addr), 'Address ' + addr + ' was not found');
        }
    });
}

// Test every member of Player struct for chosen account other than is_player,
// which shuld always be true
function test_player_data(msg, account, player_struct) {
    it(msg, async () => {
        let [is_player, vote_hash, votes_for] = await async_init.instance.m_players(account);
        assert(is_player);
        assert.equal(vote_hash, player_struct.vote_hash);
        assert.equal(votes_for, player_struct.votes_for);
    });
}

function test_voted_count(msg, count) {
    it(msg, async () => {
        let voted_count = await async_init.instance.m_voted_player_count();
        assert.equal(voted_count, count);
    });
}

function test_confirmed_count(msg, count) {
    it(msg, async () => {
        let confirmed_count = await async_init.instance.m_confirmed_voter_count();
        assert.equal(confirmed_count, count);
    });
}

async function send_vote(from, to, secret) {
    let hash = abi.soliditySHA3(['address', 'bytes32'], [to, secret]).toString();
    await async_init.instance.vote(hash, {from: from});
}

function test_send_vote(from, to, secret) {
    it('should not crash on vote', async () => {
        await send_vote(from, to, secret);
    });
}

async function force_vote_end() {
    await async_init.instance.force_finish_voting();
}

function test_force_vote_end() {
    it('should not crash when forcing voting to end', async () => {
        await force_vote_end();
    });
}

contract.only('Game_blind_vote', async (accounts) => {
    let account1 = accounts[0];
    let account2 = accounts[1];
    let account3 = accounts[2];
    let account4 = accounts[3];
    let owner = account1;
    let secret = 'x'.repeat(32);

    describe('Invalid construcion', async () => {
        it('should deny list of under 2 players', async () => {
            await expect_throw(Game.new([]));
            await expect_throw(Game.new([account1]), {from: owner});
        });

        it('should deny null addresses', async () => {
            zero = '0'.repeat(42);
            await expect_throw(Game.new([zero, account1, account2, account3]), {from: owner});
        });

        it('should deny repeated addresses', async () => {
            await expect_throw(Game.new([account1, account1, account2], {from: owner}));
        });
    });

    describe('Valid construction', async () => {
        let addr_list = [account1, account2];
        async_init.new(Game, addr_list, {from: owner});

        test_player_addresses('should store list of all players addresses', addr_list);
        test_player_count('should have correct player count', 2);
        test_player_data(
            'should have set the correct data for account1',
            account1, {votes_for: 0, vote_hash: 0}
        );
        test_player_data(
            'should have set the correct data for account2',
            account2, {votes_for: 0, vote_hash: 0}
        );
        test_voted_count('should have no votes', 0);
        test_confirmed_count('should have no confirmed votes', 0);
    });

    describe('Voting state', async () => {
        let addr_list = [account1, account2, account3];
        let from = account1;
        let to = account2;

        async_init.new(Game, addr_list, {from: owner});
        test_send_vote(from, to, secret);

        it('should disallow confirming votes', async () => {
            await expect_throw(async_init.instance.confirm(to, secret, {from: from}));
        });

        it('should disallow non-player from voting', async () => {
            await expect_throw(send_vote(account4, to, secret));
        });
    });

    describe('Forced Voting->Confirming transition', async () => {
        let addr_list = [account1, account2];
        async_init.new(Game, addr_list, {from: owner});
        test_force_vote_end();

        it('should not allow voting afterwards', async () => {
            await expect_throw(send_vote(addr_list[0], addr_list[1], secret));
        });
    });

    describe('Natural Voting->Confirming transition', async () => {
        let addr_list = [account1, account2];
        async_init.new(Game, addr_list, {from: owner});
        test_send_vote(account1, account2, secret);
        test_send_vote(account2, account2, secret);
        
        it('should not allow voting afterwards', async () => {
            await expect_throw(send_vote(addr_list[0], addr_list[1], secret));
        });
    })
});
