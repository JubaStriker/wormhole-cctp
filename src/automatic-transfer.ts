import { wormhole } from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import solana from '@wormhole-foundation/sdk/solana';
import { getSigner } from './helpers/helpers';

(async function () {
    // Initialize the Wormhole object for the Testnet environment and add supported chains (evm and solana)
    const wh = await wormhole('Mainnet', [evm, solana]);

    // Set up source and destination chains
    const sendChain = wh.getChain('Ethereum');
    const rcvChain = wh.getChain('Solana');

    // Configure the signers
    const source = await getSigner(sendChain);
    const destination = await getSigner(rcvChain);

    // Define the transfer amount (in the smallest unit, so 0.1 USDC = 100,000 units assuming 6 decimals)
    const amt = 1000n;

    const automatic = true;

    // Create the Circle transfer object (USDC-only)
    const xfer = await wh.circleTransfer(
        amt,
        source.address,
        destination.address,
        automatic
    );
    console.time("TransferTime");
    console.log('Circle Transfer object created:', xfer);

    // Initiate the transfer on the source chain (Avalanche)
    console.log('Starting Transfer');
    const srcTxids = await xfer.initiateTransfer(source.signer);
    console.log(`Started Transfer: `, srcTxids);
    console.timeEnd("TransferTime");
    process.exit(0);
})();