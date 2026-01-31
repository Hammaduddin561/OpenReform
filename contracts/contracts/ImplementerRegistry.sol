// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.29;

contract ImplementerRegistry {
  event ImplementerProfileSet(address implementer, string profileCID, uint256 timestamp);

  mapping(address => string) private _profiles;

  function setProfile(string calldata profileCID) external {
    require(bytes(profileCID).length > 0, "EMPTY_CID");
    _profiles[msg.sender] = profileCID;

    emit ImplementerProfileSet(msg.sender, profileCID, block.timestamp);
  }

  function getProfile(address implementer) external view returns (string memory) {
    return _profiles[implementer];
  }
}