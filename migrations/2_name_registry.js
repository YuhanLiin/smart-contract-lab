var Name = artifacts.require('Name_registry');
var UniqueName = artifacts.require('Unique_name_registry');

module.exports = function(deployer){
    deployer.deploy(Name);
    deployer.deploy(UniqueName);
}
