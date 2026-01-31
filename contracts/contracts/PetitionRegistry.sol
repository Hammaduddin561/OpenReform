// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.29;

contract PetitionRegistry {
  event PetitionCreated(uint256 petitionId, address creator, string contentCID, uint256 timestamp);
  event Supported(uint256 petitionId, address supporter, uint256 timestamp);

  struct Petition {
    address creator;
    string contentCID;
    uint256 createdAt;
    uint256 supportCount;
    bool exists;
  }

  uint256 private _nextPetitionId = 1;
  mapping(uint256 => Petition) private _petitions;
  mapping(uint256 => mapping(address => bool)) private _supporters;

  function totalPetitions() external view returns (uint256) {
    return _nextPetitionId - 1;
  }

  function getPetition(uint256 petitionId)
    external
    view
    returns (address creator, string memory contentCID, uint256 createdAt, uint256 supportCount)
  {
    Petition storage petition = _petitions[petitionId];
    require(petition.exists, "PETITION_NOT_FOUND");

    return (petition.creator, petition.contentCID, petition.createdAt, petition.supportCount);
  }

  function hasSupported(uint256 petitionId, address supporter) external view returns (bool) {
    return _supporters[petitionId][supporter];
  }

  function createPetition(string calldata contentCID) external returns (uint256 petitionId) {
    require(bytes(contentCID).length > 0, "EMPTY_CID");

    petitionId = _nextPetitionId++;
    _petitions[petitionId] = Petition({
      creator: msg.sender,
      contentCID: contentCID,
      createdAt: block.timestamp,
      supportCount: 0,
      exists: true
    });

    emit PetitionCreated(petitionId, msg.sender, contentCID, block.timestamp);
  }

  function support(uint256 petitionId) external {
    Petition storage petition = _petitions[petitionId];
    require(petition.exists, "PETITION_NOT_FOUND");
    require(!_supporters[petitionId][msg.sender], "ALREADY_SUPPORTED");

    _supporters[petitionId][msg.sender] = true;
    petition.supportCount += 1;

    emit Supported(petitionId, msg.sender, block.timestamp);
  }
}