const { FlashbotsBundleProvider } = require("@flashbots/ethers-provider-bundle");
const {BigNumber} = require("ethers");
const {ethers} = require("hardhat");
require("dotenv").config({path:".env"});

async function main(){
    const nftContract = await ethers.getContractFactory("FakeNFT");
    const deployedContract = await nftContract.deploy();
    await deployedContract.deployed();
    console.log("Address of Fake NFT Contract:", deployedContract.address);
    const provider = new ethers.providers.WebSocketProvider(
        process.env.QUICKNODE_WS_URL,
        "goerli"
    );
    
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const flashbotsProvider = await FlashbotsBundleProvider.create(
        provider,
        signer,
        // URL for the flashbots relayer
        "https://relay-goerli.flashbots.net",
        "goerli"
      );

      provider.on("block", async (blockNumber) => {
        console.log("Block Number: ", blockNumber);
        // Send a bundle of transactions to the flashbot relayer
        const bundleResponse = await flashbotsProvider.sendBundle(
          [
            {
              transaction: {
                // ChainId for the Goerli network
                chainId: 5,
                // EIP-1559
                type: 2,
                // Value of 1 FakeNFT
                value: ethers.utils.parseEther("0.01"),
                // Address of the FakeNFT
                to: deployedContract.address,
                // In the data field, we pass the function selctor of the mint function
                data: deployedContract.interface.getSighash("mint()"),
                // Max Gas Fes you are willing to pay
                maxFeePerGas: BigNumber.from(10).pow(9).mul(3),
                // Max Priority gas fees you are willing to pay
                maxPriorityFeePerGas: BigNumber.from(10).pow(9).mul(2),
              },
              signer: signer,
            },
          ],
          blockNumber + 1
        );
    
        // If an error is present, log it
        if ("error" in bundleResponse) {
          console.log(bundleResponse.error.message);
        }
      });
}

main();
/*

In the case of WebSockets, however, the client 
opens a connection with the 
WebSocket server once, and then the server 
continuously sends them updates as long as the 
connection remains open. Therefore the client 
does not need to send requests again and again.

As a reason, we listen for each block 
and send a request 
in each block so that when the coinbase 
miner(miner of the current block) is a 
flashbots miner, our transaction gets included.

*/