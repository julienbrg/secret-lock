// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract SecretLock is Ownable {
    mapping(bytes32 => bool) private usedCommitments;
    mapping(address => bool) public authorizedSigners;

    event SignerUpdated(address indexed signer, bool status);
    event CommitmentVerified(address indexed recipient, bytes32 indexed commitment);

    error InvalidSigner();
    error CommitmentAlreadyUsed();
    error InvalidSignature();

    constructor() Ownable(msg.sender) {}

    function addSigner(address _signer) external onlyOwner {
        authorizedSigners[_signer] = true;
        emit SignerUpdated(_signer, true);
    }

    function removeSigner(address _signer) external onlyOwner {
        authorizedSigners[_signer] = false;
        emit SignerUpdated(_signer, false);
    }

    function verifyCommitment(
        bytes32 _commitment,
        bytes memory _signature,
        address _signer
    ) external returns (bool) {
        if (!authorizedSigners[_signer]) {
            revert InvalidSigner();
        }
        if (usedCommitments[_commitment]) {
            revert CommitmentAlreadyUsed();
        }

        // Create message hash
        bytes32 hash = MessageHashUtils.toEthSignedMessageHash(
            keccak256(abi.encodePacked(_commitment, msg.sender))
        );

        // Verify the signature using SignatureChecker
        if (!SignatureChecker.isValidSignatureNow(_signer, hash, _signature)) {
            revert InvalidSignature();
        }

        usedCommitments[_commitment] = true;
        emit CommitmentVerified(msg.sender, _commitment);
        return true;
    }

    function isCommitmentUsed(bytes32 _commitment) external view returns (bool) {
        return usedCommitments[_commitment];
    }
}
