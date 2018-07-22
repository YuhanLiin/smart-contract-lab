const Name = artifacts.require('Name_registry');
const UniqueName = artifacts.require('Unique_name_registry');
const expect_throw = require('./utils/expect_throw.js')
const async_init = require('./utils/async_init.js');

function test_user_count(msg, number) {
    it(msg, async () => {
        let user_count = await async_init.instance.m_registered_user_count();
        assert.equal(user_count.toNumber(), number);
    });
}

function test_get_name(msg, account, name) {
    it(msg, async () => {
        let acc_name = await async_init.instance.get_name({from: account});
        assert.equal(acc_name, name);
    });
}

function register_both(account1, account2){
    it('should not crash when registering', async () => {
        await async_init.instance.register("account1", {from: account1});
        await async_init.instance.register("account2", {from: account2});
    });
}

function remove_one(account){
    it('should not crash when removing', async () => {
        await async_init.instance.remove({from: account});
    });
}

function change_name(account, name) {
    it('should not crash when changing name', async () => {
        await async_init.instance.change_name(name, {from: account});
    });
}

// Generates function containing basic tests for both the unique and non-unique registries
function generic_registry_tests(contract_type) {    
    big_string = 'abc'.repeat(128);

    return async (accounts) => {
        let account1 = accounts[0];
        let account2 = accounts[1];
        let account3 = accounts[2];
        let account4 = accounts[3];

        describe('Empty registry', async () => {
            async_init.new(contract_type);

            test_user_count('should have no users', 0);

            // None of these should work with an empty contract
            it('should throw on get_name', async () => {
                await expect_throw(async_init.instance.get_name({from: account1}));
            });
            
            it('should throw on remove', async () => {
                await expect_throw(async_init.instance.remove({from: account1}));
            });

            it('should throw on change_name', async () => {
                await expect_throw(async_init.instance.change_name("test", {from: account1}));
            });
        });

        describe('Registering', async () => {
            async_init.new(contract_type);
            register_both(account1, account2);
            test_user_count('should have 2 users', 2);
            test_get_name('should be aware of account1 name', account1, "account1");
            test_get_name('should be aware of account2 name', account2, "account2");

            it('should not accept invalid names', async () => {
                await expect_throw(async_init.instance.register(account3, ''));
                await expect_throw(async_init.instance.register(account4, big_string));
            })
        });

        describe('Removing', async () => {
            async_init.new(contract_type);
            register_both(account1, account2);
            remove_one(account2); 
            test_user_count('should lower the user count', 1);

            it('should make removed user name inaccessible', async () => {
                await expect_throw(async_init.instance.get_name({from: account2}));
            });

            test_get_name('should not tamper with existing user', account1, "account1");
        });   


        describe('Change Name', async () => {
            async_init.new(contract_type);
            register_both(account1, account2);
            change_name(account2, '%%$#');
            test_user_count('should not change user count', 2);
            test_get_name('should change name of affected user', account2, "%%$#");

            it('should not accept invalid names', async () => {
                await expect_throw(async_init.instance.change_name(account3, ''));
                await expect_throw(async_init.instance.change_name(account4, big_string));
            })
        });
    };       
}

// Generates tests unique to Unique_name_registry
function unique_name_tests(){
    let contract_type = UniqueName;

    function test_get_address(msg, name, account) {
        it(msg, async () => {
            let addr = await async_init.instance.get_address(name);
            assert.equal(addr, account);
        });
    }

    return async (accounts) => {
        let account1 = accounts[0];
        let account2 = accounts[1];
        let account3 = accounts[2];

        describe('Registering name', async () => {
            async_init.new(contract_type);
            register_both(account1, account2);

            it('should not allow the same name to be registered again', async () => {
                await expect_throw(async_init.instance.register('account1', account3));
            });
            test_get_address('should retrieve account1 address', 'account1', account1);
            test_get_address('should retrieve account2 address', 'account2', account2);
        });

        describe('Removing name', async () => {
            async_init.new(contract_type);
            register_both(account1, account2);
            remove_one(account1);

            it('should make address of removed user inaccessible', async () => {
                await expect_throw(async_init.instance.get_address('account1', account1));
            });
        });

        describe('Changing name', async () => {
            async_init.new(contract_type);
            register_both(account1, account2);
            change_name(account1, '{}');
            test_get_address("should let address be indexed via new name", '{}', account1);

            it('should render old name useless', async () => {
                await expect_throw(async_init.instance.get_address('account1', account1));
            });
        })
    }
}

contract('Name_registry', generic_registry_tests(Name));
contract('Unique_name_registry - Basic cases', generic_registry_tests(UniqueName));
contract('Unique_name_registry - Uniqueness cases', unique_name_tests());
