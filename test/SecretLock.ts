import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers"
import { expect } from "chai"
import { ethers } from "hardhat"

describe("SecretLock", function () {
    async function deploySecretLock() {
        const [owner, authorized, unauthorized, recipient] =
            await ethers.getSigners()
        const SecretLock = await ethers.getContractFactory("SecretLock")
        const secretLock = await SecretLock.deploy()

        return { secretLock, owner, authorized, unauthorized, recipient }
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { secretLock, owner } = await loadFixture(deploySecretLock)
            expect(await secretLock.owner()).to.equal(owner.address)
        })
    })

    describe("Signer Management", function () {
        it("Should allow owner to add a signer", async function () {
            const { secretLock, authorized } =
                await loadFixture(deploySecretLock)
            await expect(secretLock.addSigner(authorized.address))
                .to.emit(secretLock, "SignerUpdated")
                .withArgs(authorized.address, true)
            expect(await secretLock.authorizedSigners(authorized.address)).to.be
                .true
        })

        it("Should allow owner to remove a signer", async function () {
            const { secretLock, authorized } =
                await loadFixture(deploySecretLock)
            await secretLock.addSigner(authorized.address)
            await expect(secretLock.removeSigner(authorized.address))
                .to.emit(secretLock, "SignerUpdated")
                .withArgs(authorized.address, false)
            expect(await secretLock.authorizedSigners(authorized.address)).to.be
                .false
        })

        it("Should not allow non-owner to add a signer", async function () {
            const { secretLock, authorized, unauthorized } =
                await loadFixture(deploySecretLock)
            await expect(
                secretLock.connect(unauthorized).addSigner(authorized.address)
            ).to.be.revertedWithCustomError(
                secretLock,
                "OwnableUnauthorizedAccount"
            )
        })
    })

    describe("Commitment Verification", function () {
        async function setupCommitmentScenario() {
            const { secretLock, owner, authorized, unauthorized, recipient } =
                await loadFixture(deploySecretLock)

            // Add authorized signer
            await secretLock.addSigner(authorized.address)

            // Create a commitment from IPFS CID
            const fakeCid = "QmXnnyufdzQX7iJbf1YQ8tgfXGeQCiHnRx7xNBqYJi9z67"
            const commitment = ethers.keccak256(ethers.toUtf8Bytes(fakeCid))

            // Create the message to be signed (match contract's hashing)
            const messageHash = ethers.keccak256(
                ethers.solidityPacked(
                    ["bytes32", "address"],
                    [commitment, recipient.address]
                )
            )

            // Sign the message (this adds the Ethereum Signed Message prefix under the hood)
            const signature = await authorized.signMessage(
                ethers.getBytes(messageHash)
            )

            return {
                secretLock,
                owner,
                authorized,
                unauthorized,
                recipient,
                commitment,
                signature,
                messageHash
            }
        }

        it("Should verify valid commitment and signature", async function () {
            const { secretLock, authorized, recipient, commitment, signature } =
                await setupCommitmentScenario()

            await expect(
                secretLock
                    .connect(recipient)
                    .verifyCommitment(commitment, signature, authorized.address)
            )
                .to.emit(secretLock, "CommitmentVerified")
                .withArgs(recipient.address, commitment)
        })

        it("Should reject unauthorized signer", async function () {
            const {
                secretLock,
                unauthorized,
                recipient,
                commitment,
                signature
            } = await setupCommitmentScenario()

            await expect(
                secretLock
                    .connect(recipient)
                    .verifyCommitment(
                        commitment,
                        signature,
                        unauthorized.address
                    )
            ).to.be.revertedWithCustomError(secretLock, "InvalidSigner")
        })

        it("Should reject reused commitment", async function () {
            const { secretLock, authorized, recipient, commitment, signature } =
                await setupCommitmentScenario()

            // First use
            await secretLock
                .connect(recipient)
                .verifyCommitment(commitment, signature, authorized.address)

            // Second use should fail
            await expect(
                secretLock
                    .connect(recipient)
                    .verifyCommitment(commitment, signature, authorized.address)
            ).to.be.revertedWithCustomError(secretLock, "CommitmentAlreadyUsed")
        })

        it("Should reject invalid signature", async function () {
            const { secretLock, authorized, recipient, commitment } =
                await setupCommitmentScenario()

            const fakeSignature = ethers.concat([
                ethers.randomBytes(64),
                new Uint8Array([27])
            ])

            await expect(
                secretLock
                    .connect(recipient)
                    .verifyCommitment(
                        commitment,
                        fakeSignature,
                        authorized.address
                    )
            ).to.be.revertedWithCustomError(secretLock, "InvalidSignature")
        })

        it("Should correctly track used commitments", async function () {
            const { secretLock, authorized, recipient, commitment, signature } =
                await setupCommitmentScenario()

            expect(await secretLock.isCommitmentUsed(commitment)).to.be.false

            await secretLock
                .connect(recipient)
                .verifyCommitment(commitment, signature, authorized.address)

            expect(await secretLock.isCommitmentUsed(commitment)).to.be.true
        })
    })
})
