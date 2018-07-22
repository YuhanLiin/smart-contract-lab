const Game = artifacts.require('Game_blind_vote');
const expect_throw = require('./utils/expect_throw.js')

contract('Game_blind_vote', async (accounts) => {
    let account1 = accounts[0];
    let account2 = accounts[1];
    let account3 = accounts[2];
    let account4 = accounts[3];

    describe('Invalid construcion', async () => {
        it('should deny list of under 2 players', async () => {
            expect_throw(Game.new([]));
            expect_throw(Game.new([account1]));
        });
    });
});
