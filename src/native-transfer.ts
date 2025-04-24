import {
    Chain,
    Network,
    Wormhole,
    amount,
    wormhole,
    TokenId,
    TokenTransfer,
    TransactionId,
    Signer,
    CircleTransfer,
} from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import solana from '@wormhole-foundation/sdk/solana';
import sui from '@wormhole-foundation/sdk/sui';
import { SignerStuff, getSigner, getTokenDecimals } from './helpers/helpers';

(async function () {
    try {
        const wh = await wormhole('Mainnet', [evm, solana, sui]);

        const sendChain = wh.getChain('Ethereum');
        const rcvChain = wh.getChain('Sui');

        const source = await getSigner(sendChain);
        const destination = await getSigner(rcvChain)

        const token = Wormhole.tokenId(sendChain.chain, 'native');

        const amt = '0.01';

        const automatic = false;

        const decimals = await getTokenDecimals(wh, token, sendChain);

        console.log('Decimal values for token', decimals, token,);

        const xfer = await tokenTransfer(wh, {
            token,
            amount: amount.units(amount.parse(amt, decimals)),
            source,
            destination,
            automatic,
        });

        async function tokenTransfer<N extends Network>(
            wh: Wormhole<N>,
            route: {
                token: TokenId;
                amount: bigint;
                source: SignerStuff<N, Chain>;
                destination: SignerStuff<N, Chain>;
                automatic: boolean;
                payload?: Uint8Array;
            }
        ) {
            // Token Transfer Logic

            console.log(`Token transfer initiated with ${route}`);

            const xfer = await wh.tokenTransfer(
                route.token,
                route.amount,
                route.source.address,
                route.destination.address,
                route.automatic ?? false,
                route.payload
            );

            const quote = await TokenTransfer.quoteTransfer(
                wh,
                route.source.chain,
                route.destination.chain,
                xfer.transfer
            );

            console.log(quote);

            if (xfer.transfer.automatic && quote.destinationToken.amount < 0)
                throw 'The amount requested is too low to cover the fee and any native gas requested.';

            // const srcTxids = await xfer.initiateTransfer(route.source.signer);
            // console.log(`Source Trasaction ID: ${srcTxids[0]}`);
            // console.log(`Wormhole Trasaction ID: ${srcTxids[1] ?? srcTxids[0]}`);

            // console.log('Getting Attestation');
            // await xfer.fetchAttestation(60_000000);

            // const destTxids = await xfer.completeTransfer(route.destination.signer);
            // console.log(`Completed Transfer: `, destTxids);

            // const reXfer = await CircleTransfer.from(wh, '0xc090f990b855969f01b2efbfdd50d3772679bb5b24c8d38f908a97d9ba1214c6');

            // console.log('Waiting for attestation...');
            // const attestIds = await reXfer.fetchAttestation(60 * 60 * 1000);
            // console.log('Got attestation: ', attestIds);

            // const dstTxIds = await reXfer.completeTransfer(route.destination.signer);
            // console.log('Completed transfer: ', dstTxIds)
        }

        process.exit(0);
    } catch (err) {
        console.log(`Error in token transfer`, err);
    }
})();

async function completeTransfer(
    wh: Wormhole<Network>,
    txid: TransactionId,
    signer: Signer
): Promise<void> {
    const xfer = await CircleTransfer.from(wh, txid);

    console.log('Waiting for attestation...');
    const attestIds = await xfer.fetchAttestation(60 * 60 * 1000);
    console.log('Got attestation: ', attestIds);

    const dstTxIds = await xfer.completeTransfer(signer);
    console.log('Completed transfer: ', dstTxIds);
}
