module.exports = async function expect_throw (promise) {
    try {
        await promise;
    }
    catch (error) {
        assert(
            error.message.search('revert') >= 0,
            'Expected a contract revert, got ' + error.message + ' instead'
        );
        return;
    }
    assert.fail();
}
