module.exports = async function expect_throw (promise) {
    try {
        await promise;
    }
    catch (error) {
        return;
    }
    assert.fail();
}
