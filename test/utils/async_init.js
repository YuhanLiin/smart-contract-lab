// The contract instance that will be used by all tests
module.exports.instance = null;

// Handles all the async startup code by wrapping them in a 'it()'
// Starts by instantiating a contract of a specified type
// Put at beginning of every describe block
module.exports.new = function (contract_type, ...args) {
    it('should have initialized properly', async () => {
        module.exports.instance = await contract_type.new(...args);
    });
}

// Same as above, using deploy instead of new
module.exports.deploy = function (contract_type, ...args) {
    it('should have deployed properly', async () => {
        module.exports.instance = await contract_type.deploy(...args);
    });
}

