pragma solidity ^0.4.23;

contract Name_registry {
    mapping(address => string) internal m_names;

    uint public m_registered_user_count;

    event user_register(address addr, string name);
    event user_remove(address addr, string name);
    event user_change_name(address addr, string old_name, string new_name);

    function is_null(string str) internal pure returns(bool) {
        return bytes(str).length == 0;
    }

    modifier address_not_registered(){
        require(is_null(m_names[msg.sender]), "You have already registered.");
        _;
    }

    modifier address_is_registered(){
        require(!is_null(m_names[msg.sender]), "You are not yet registered.");
        _;
    }

    modifier valid_name(string name){
        require(!is_null(name), "Your name cannot be the empty string");
        require(bytes(name).length <= 128, "Your name cannot exceed 128 bytes");
        _;
    }
    
    function register(string name)
        public
        valid_name(name)
        address_not_registered
    {
        m_names[msg.sender] = name;
        m_registered_user_count++;
        emit user_register(msg.sender, name);
    }

    function remove()
        public
        address_is_registered
    {
        string storage name = m_names[msg.sender];
        assert(!is_null(name));
        delete m_names[msg.sender];
        m_registered_user_count--;
        emit user_remove(msg.sender, name);
    }

    function change_name(string name)
        public
        valid_name(name)
        address_is_registered
    {
        string storage old_name = m_names[msg.sender];
        assert(!is_null(old_name));
        m_names[msg.sender] = name;
        emit user_change_name(msg.sender, old_name, name);
    }

    function get_name()
        public view
        address_is_registered
        returns (string)
    {
        return m_names[msg.sender];
    }
}

// All names are unique, so a reversed mapping need to be maintained as well
contract Unique_name_registry is Name_registry{
    mapping(string => address) internal m_addresses;

    modifier name_not_registered(string name){
        require(m_addresses[name] == 0, "The requested name has already been taken.");
        _;
    }

    modifier name_is_registered(string name){
        require(m_addresses[name] != 0, "The requested name is not registed.");
        _;
    }

    // Add brand new user with unique name
    function register(string name)
        public
        name_not_registered(name)
    {
        m_addresses[name] = msg.sender;
        super.register(name);
    }

    // Remove user from registry along with their name
    function remove()
        public
        address_is_registered
    {
        string storage name = m_names[msg.sender];
        assert(!is_null(name));
        delete m_addresses[name];
        super.remove();
    }

    // Change name of user. Old name is no longer registered
    function change_name(string name)
        public
        address_is_registered
        name_not_registered(name)
    {
        string storage old_name = m_names[msg.sender];
        assert(!is_null(old_name));
        delete m_addresses[old_name];
        m_addresses[name] = msg.sender;
        super.change_name(name);
    }

    // Get address of user from unique name
    function get_address(string name)
        public view
        // No need to force the name to be valid since invalid names are not registered anyways
        name_is_registered(name)
        returns (address)
    {
        return m_addresses[name];
    }
}
