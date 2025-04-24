import { CircleTransfer, TokenTransfer, TransactionId, wormhole } from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import solana from '@wormhole-foundation/sdk/solana';
import { getSigner, waitForRelay } from './helpers/helpers';


(async function () {
    const wh = await wormhole('Mainnet', [evm, solana]);

    // Set up source and destination chains
    const sendChain = wh.getChain('Solana');
    const rcvChain = wh.getChain('Ethereum');

    // Configure the signers
    const source = await getSigner(sendChain);
    const destination = await getSigner(rcvChain);

    // Define the transfer amount (in the smallest unit, so 0.1 USDC = 100,000 units assuming 6 decimals)
    const amt = 100n;  // 1 USDC

    const automatic = false;

    // Create the Circle transfer object 
    const xfer = await wh.circleTransfer(
        amt,
        source.address,
        destination.address,
        automatic
    );

    console.time("TransferTime");

    const quote = await CircleTransfer.quoteTransfer(sendChain, rcvChain, xfer.transfer);
    console.log("Quote", quote);

    console.log("Starting Transfer");

    console.log('Circle Transfer object created:', xfer);

    console.log('Transfer', xfer.transfer.from.address);

    const srcTxids = await xfer.initiateTransfer(source.signer);
    console.log(`Started Transfer: `, srcTxids);

    // if (automatic) {
    //     const txid = srcTxids[srcTxids.length - 1]! as TransactionId;
    //     const relayStatus = await waitForRelay(txid, wh, destination.signer);
    //     console.log(`Finished relay: `, relayStatus);
    //     return;
    // }

    // Wait for Circle Attestation (VAA)
    const timeout = 50 * 60 * 1000; // Timeout in milliseconds (60 seconds)
    console.log('Waiting for Attestation');
    const attestIds = await xfer.fetchAttestation(timeout);
    console.log(`Got Attestation: `, attestIds);

    // Complete the transfer on the destination chain (Sepolia)
    console.log('Completing Transfer');
    const dstTxids = await xfer.completeTransfer(destination.signer);
    console.log(`Completed Transfer: `, dstTxids);

    console.log('Circle Transfer status: ', xfer);

    console.timeEnd("TransferTime");

    process.exit(0);
})();