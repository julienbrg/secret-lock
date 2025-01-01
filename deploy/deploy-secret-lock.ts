import "@nomiclabs/hardhat-ethers"
import color from "cli-color"
var msg = color.xterm(39).bgXterm(128)
import hre, { ethers, network } from "hardhat"

export default async ({ getNamedAccounts, deployments }: any) => {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    console.log("deployer:", deployer)

    function wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    const secretLock = await deploy("SecretLock", {
        from: deployer,
        args: [],
        log: true
    })

    // Verification for different networks
    switch (hre.network.name) {
        case "optimism":
            try {
                console.log(
                    "SecretLock contract deployed:",
                    msg(secretLock.receipt.contractAddress)
                )
                console.log("\nEtherscan verification in progress...")
                await wait(30 * 1000)
                await hre.run("verify:verify", {
                    network: network.name,
                    address: secretLock.receipt.contractAddress,
                    constructorArguments: []
                })
                console.log("Etherscan verification done. ✅")
            } catch (error) {
                console.error(error)
            }
            break

        case "base":
            try {
                console.log(
                    "SecretLock contract deployed:",
                    msg(secretLock.receipt.contractAddress)
                )
                console.log("\nBasescan verification in progress...")
                await wait(30 * 1000)
                await hre.run("verify:verify", {
                    network: network.name,
                    address: secretLock.receipt.contractAddress,
                    constructorArguments: []
                })
                console.log("Basescan verification done. ✅")
            } catch (error) {
                console.error(error)
            }
            break

        case "arbitrum":
            try {
                console.log(
                    "SecretLock contract deployed:",
                    msg(secretLock.receipt.contractAddress)
                )
                console.log("\nArbiscan verification in progress...")
                await wait(30 * 1000)
                await hre.run("verify:verify", {
                    network: network.name,
                    address: secretLock.receipt.contractAddress,
                    constructorArguments: []
                })
                console.log("Arbiscan verification done. ✅")
            } catch (error) {
                console.error(error)
            }
            break
    }
}

export const tags = ["SecretLock"]