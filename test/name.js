const Name = artifacts.require('Name_registry');
const UniqueName = artifacts.require('Unique_name_registry');

async function expect_throw (promise) {
    try {
        await promise;
    }
    catch (error) {
        return;
    }
    assert.fail();
}

// This is the contract instance re-initialized for every test
let instance;

function test_user_count(msg, number) {
    it(msg, async () => {
        let user_count = await instance.m_registered_user_count();
        assert.equal(user_count.toNumber(), number);
    });
}

function test_get_name(msg, account, name) {
    it(msg, async () => {
        let acc_name = await instance.get_name({from: account});
        assert.equal(acc_name, name);
    });
}

// Handles all the async startup code by wrapping them in a 'it()'
// Starts by instantiating a contract of a specified type
// Can take any number of functions returning async functions to be processed
function async_prelude(contract_type, ...async_generators) {
    it('should have initialized properly', async () => {
        instance = await contract_type.new();
        for (async_gen of async_generators) {
            await async_gen();
        }
    });
}

function register_both(account1, account2){
    it('should not crash when registering', async () => {
        await instance.register("account1", {from: account1});
        await instance.register("account2", {from: account2});
    });
}

function remove_one(account){
    it('should not crash when removing', async () => {
        await instance.remove({from: account});
    });
}

function change_name(account, name) {
    it('should not crash when changing name', async () => {
        await instance.change_name(name, {from: account});
    });
}

// Generates function containing basic tests for both the unique and non-unique registries
function generic_registry_tests(contract_type) {    
    return async (accounts) => {
        let account1 = accounts[0];
        let account2 = accounts[1];


        describe('Empty registry', async () => {
            async_prelude(contract_type);

            test_user_count('should have no users', 0);

            // None of these should work with an empty contract
            it('should throw on get_name', async () => {
                await expect_throw(instance.get_name({from: account1}));
            });
            
            it('should throw on remove', async () => {
                await expect_throw(instance.remove({from: account1}));
            });

            it('should throw on change_name', async () => {
                await expect_throw(instance.change_name("test", {from: account1}));
            });
        });

        describe('Registering', async () => {
            async_prelude(contract_type);
            register_both(account1, account2);
            test_user_count('should have 2 users', 2);
            test_get_name('should be aware of account1 name', account1, "account1");
            test_get_name('should be aware of account2 names', account2, "account2");
        });

        describe('Removing', async () => {
            async_prelude(contract_type);
            register_both(account1, account2);
            remove_one(account2); 
            test_user_count('should lower the user count', 1);

            it('should make removed user name inaccessible', async () => {
                await expect_throw(instance.get_name({from: account2}));
            });

            test_get_name('should not tamper with existing user', account1, "account1");
        });   


        describe('Change Name', async () => {
            async_prelude(contract_type);
            register_both(account1, account2);
            change_name(account2, '%%$#');
            test_user_count('should not change user count', 2);
            test_get_name('should change name of affected user', account2, "%%$#");
        });
    };       
}

contract('Name_registry', generic_registry_tests(Name));
contract('Name_registry', generic_registry_tests(UniqueName));
