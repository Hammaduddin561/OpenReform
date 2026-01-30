// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

interface IPetitionRegistry {
  function getPetition(uint256 petitionId)
    external
    view
    returns (address creator, string memory contentCID, uint256 createdAt, uint256 supportCount);
}

contract EscrowMilestones {
  event Funded(uint256 petitionId, address funder, uint256 amount, uint256 timestamp);
  event ImplementerAccepted(uint256 petitionId, address implementer, string profileCID, uint256 timestamp);
  event MilestoneSubmitted(uint256 petitionId, uint256 milestoneIndex, string proofCID, uint256 timestamp);
  event MilestoneApproved(uint256 petitionId, uint256 milestoneIndex, address approver, uint256 timestamp);
  event PayoutReleased(uint256 petitionId, uint256 milestoneIndex, uint256 amount, address implementer, uint256 timestamp);
  event RefundsClaimed(uint256 petitionId, address claimant, uint256 amount, uint256 timestamp);

  struct PetitionEscrow {
    address creator;
    address implementer;
    uint256 deadline;
    uint256 totalFunded;
    uint256 totalPaid;
    uint256 milestoneCount;
    uint256 currentMilestone;
    bool initialized;
  }

  struct Milestone {
    uint256 amount;
    bool approved;
    bool paid;
    string proofCID;
    uint256 submittedAt;
    uint256 submissionCount;
  }

  struct Vote {
    uint256 yesVotes;
    uint256 noVotes;
    uint256 endTime;
    bool finalized;
  }

  IPetitionRegistry public immutable petitionRegistry;
  uint256 public immutable votingWindow;

  mapping(uint256 => PetitionEscrow) private _escrows;
  mapping(uint256 => Milestone[]) private _milestones;
  mapping(uint256 => mapping(address => uint256)) private _fundedBy;
  mapping(address => uint256) private _pendingPayouts;

  mapping(uint256 => mapping(uint256 => Vote)) private _votes;
  mapping(uint256 => mapping(uint256 => uint256)) private _voteRounds;
  mapping(uint256 => mapping(uint256 => mapping(address => uint256))) private _lastVotedRound;

  uint256 private _locked = 1;

  constructor(address petitionRegistryAddress, uint256 votingWindowSeconds) {
    require(petitionRegistryAddress != address(0), "INVALID_REGISTRY");
    require(votingWindowSeconds > 0, "INVALID_WINDOW");
    petitionRegistry = IPetitionRegistry(petitionRegistryAddress);
    votingWindow = votingWindowSeconds;
  }

  modifier nonReentrant() {
    require(_locked == 1, "REENTRANCY");
    _locked = 2;
    _;
    _locked = 1;
  }

  function configureMilestones(uint256 petitionId, uint256[] calldata amounts, uint256 deadline) external {
    (address creator, , , ) = petitionRegistry.getPetition(petitionId);
    require(creator != address(0), "PETITION_NOT_FOUND");
    require(creator == msg.sender, "NOT_CREATOR");
    require(amounts.length > 0, "NO_MILESTONES");
    require(deadline > block.timestamp, "INVALID_DEADLINE");

    PetitionEscrow storage escrow = _escrows[petitionId];
    require(!escrow.initialized, "ALREADY_INITIALIZED");

    uint256 totalMilestones = amounts.length;
    for (uint256 i = 0; i < totalMilestones; i++) {
      require(amounts[i] > 0, "INVALID_MILESTONE");
      _milestones[petitionId].push(Milestone({
        amount: amounts[i],
        approved: false,
        paid: false,
        proofCID: "",
        submittedAt: 0,
        submissionCount: 0
      }));
    }

    escrow.creator = creator;
    escrow.deadline = deadline;
    escrow.milestoneCount = totalMilestones;
    escrow.currentMilestone = 0;
    escrow.initialized = true;
  }

  function fund(uint256 petitionId) external payable {
    PetitionEscrow storage escrow = _escrows[petitionId];
    require(escrow.initialized, "NOT_INITIALIZED");
    require(block.timestamp <= escrow.deadline, "FUNDING_CLOSED");
    require(msg.value > 0, "ZERO_AMOUNT");

    escrow.totalFunded += msg.value;
    _fundedBy[petitionId][msg.sender] += msg.value;

    emit Funded(petitionId, msg.sender, msg.value, block.timestamp);
  }

  function acceptImplementer(uint256 petitionId, string calldata profileCID) external {
    PetitionEscrow storage escrow = _escrows[petitionId];
    require(escrow.initialized, "NOT_INITIALIZED");
    require(escrow.implementer == address(0), "IMPLEMENTER_SET");
    require(bytes(profileCID).length > 0, "EMPTY_CID");

    escrow.implementer = msg.sender;

    emit ImplementerAccepted(petitionId, msg.sender, profileCID, block.timestamp);
  }

  function submitMilestone(uint256 petitionId, uint256 milestoneIndex, string calldata proofCID) external {
    PetitionEscrow storage escrow = _escrows[petitionId];
    require(escrow.initialized, "NOT_INITIALIZED");
    require(escrow.implementer == msg.sender, "NOT_IMPLEMENTER");
    require(milestoneIndex == escrow.currentMilestone, "NOT_CURRENT_MILESTONE");
    require(milestoneIndex < _milestones[petitionId].length, "INVALID_MILESTONE");
    require(bytes(proofCID).length > 0, "EMPTY_CID");

    Vote storage vote = _votes[petitionId][milestoneIndex];
    if (_voteRounds[petitionId][milestoneIndex] > 0) {
      require(vote.finalized, "VOTE_ACTIVE");
    }

    Milestone storage milestone = _milestones[petitionId][milestoneIndex];
    require(!milestone.approved, "ALREADY_APPROVED");
    require(milestone.submissionCount < 2, "MAX_SUBMISSIONS");

    milestone.proofCID = proofCID;
    milestone.submittedAt = block.timestamp;
    milestone.submissionCount += 1;

    uint256 round = _voteRounds[petitionId][milestoneIndex] + 1;
    _voteRounds[petitionId][milestoneIndex] = round;

    vote.yesVotes = 0;
    vote.noVotes = 0;
    vote.endTime = block.timestamp + votingWindow;
    vote.finalized = false;

    emit MilestoneSubmitted(petitionId, milestoneIndex, proofCID, block.timestamp);
  }

  function voteOnMilestone(uint256 petitionId, uint256 milestoneIndex, bool support) external {
    require(_fundedBy[petitionId][msg.sender] > 0, "NOT_FUNDER");

    Vote storage vote = _votes[petitionId][milestoneIndex];
    uint256 round = _voteRounds[petitionId][milestoneIndex];
    require(round > 0, "NO_SUBMISSION");
    require(block.timestamp <= vote.endTime, "VOTING_CLOSED");

    require(_lastVotedRound[petitionId][milestoneIndex][msg.sender] < round, "ALREADY_VOTED");
    _lastVotedRound[petitionId][milestoneIndex][msg.sender] = round;

    if (support) {
      vote.yesVotes += 1;
    } else {
      vote.noVotes += 1;
    }
  }

  function finalizeMilestone(uint256 petitionId, uint256 milestoneIndex) external nonReentrant {
    Vote storage vote = _votes[petitionId][milestoneIndex];
    uint256 round = _voteRounds[petitionId][milestoneIndex];
    require(round > 0, "NO_SUBMISSION");
    require(!vote.finalized, "VOTE_FINALIZED");
    require(block.timestamp > vote.endTime, "VOTE_ACTIVE");

    vote.finalized = true;

    if (vote.yesVotes > vote.noVotes) {
      PetitionEscrow storage escrow = _escrows[petitionId];
      Milestone storage milestone = _milestones[petitionId][milestoneIndex];

      require(!milestone.approved, "ALREADY_APPROVED");
      require(escrow.implementer != address(0), "NO_IMPLEMENTER");

      uint256 available = escrow.totalFunded - escrow.totalPaid;
      require(available >= milestone.amount, "INSUFFICIENT_FUNDS");

      milestone.approved = true;
      milestone.paid = true;
      escrow.totalPaid += milestone.amount;
      escrow.currentMilestone += 1;
      _pendingPayouts[escrow.implementer] += milestone.amount;

      emit MilestoneApproved(petitionId, milestoneIndex, msg.sender, block.timestamp);
      emit PayoutReleased(petitionId, milestoneIndex, milestone.amount, escrow.implementer, block.timestamp);
    }
  }

  function claimRefund(uint256 petitionId) external nonReentrant {
    PetitionEscrow storage escrow = _escrows[petitionId];
    require(escrow.initialized, "NOT_INITIALIZED");
    require(block.timestamp > escrow.deadline, "DEADLINE_NOT_REACHED");
    require(escrow.totalPaid == 0, "PAYOUTS_MADE");

    uint256 amount = _fundedBy[petitionId][msg.sender];
    require(amount > 0, "NOT_FUNDER");
    _fundedBy[petitionId][msg.sender] = 0;

    escrow.totalFunded -= amount;
    _safeTransfer(msg.sender, amount);

    emit RefundsClaimed(petitionId, msg.sender, amount, block.timestamp);
  }

  function withdrawPayout() external nonReentrant {
    uint256 amount = _pendingPayouts[msg.sender];
    require(amount > 0, "NO_PAYOUT");

    _pendingPayouts[msg.sender] = 0;
    _safeTransfer(msg.sender, amount);
  }

  function getEscrow(uint256 petitionId)
    external
    view
    returns (
      address creator,
      address implementer,
      uint256 deadline,
      uint256 totalFunded,
      uint256 totalPaid,
      uint256 milestoneCount,
      uint256 currentMilestone,
      bool initialized
    )
  {
    PetitionEscrow storage escrow = _escrows[petitionId];
    return (
      escrow.creator,
      escrow.implementer,
      escrow.deadline,
      escrow.totalFunded,
      escrow.totalPaid,
      escrow.milestoneCount,
      escrow.currentMilestone,
      escrow.initialized
    );
  }

  function getMilestone(uint256 petitionId, uint256 milestoneIndex)
    external
    view
    returns (
      uint256 amount,
      bool approved,
      bool paid,
      string memory proofCID,
      uint256 submittedAt,
      uint256 submissionCount
    )
  {
    require(milestoneIndex < _milestones[petitionId].length, "INVALID_MILESTONE");
    Milestone storage milestone = _milestones[petitionId][milestoneIndex];

    return (
      milestone.amount,
      milestone.approved,
      milestone.paid,
      milestone.proofCID,
      milestone.submittedAt,
      milestone.submissionCount
    );
  }

  function getVote(uint256 petitionId, uint256 milestoneIndex)
    external
    view
    returns (uint256 yesVotes, uint256 noVotes, uint256 endTime, bool finalized, uint256 round)
  {
    Vote storage vote = _votes[petitionId][milestoneIndex];
    return (vote.yesVotes, vote.noVotes, vote.endTime, vote.finalized, _voteRounds[petitionId][milestoneIndex]);
  }

  function fundedAmount(uint256 petitionId, address funder) external view returns (uint256) {
    return _fundedBy[petitionId][funder];
  }

  function pendingPayout(address implementer) external view returns (uint256) {
    return _pendingPayouts[implementer];
  }

  function _safeTransfer(address to, uint256 amount) private {
    (bool success, ) = to.call{value: amount}("");
    require(success, "TRANSFER_FAILED");
  }
}