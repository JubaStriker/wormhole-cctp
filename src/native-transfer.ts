import {
    Chain,
    Network,
    Wormhole,
    amount,
    wormhole,
    TokenId,
    TokenTransfer,
} from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import solana from '@wormhole-foundation/sdk/solana';
import sui from '@wormhole-foundation/sdk/sui';
import { SignerStuff, getSigner, getTokenDecimals } from './helpers/helpers';

(async function () {
    const wh = await wormhole('Mainnet', [evm, solana, sui]);

    const sendChain = wh.getChain('Solana');
    const rcvChain = wh.getChain('Sui');

    const source = await getSigner(sendChain);
    const destination = await getSigner(rcvChain)

    const token = Wormhole.tokenId(sendChain.chain, 'native');

    const amt = '1';

    const automatic = false;

    const decimals = await getTokenDecimals(wh, token, sendChain);

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

        if (xfer.transfer.automatic && quote.destinationToken.amount < 0)
            throw 'The amount requested is too low to cover the fee and any native gas requested.';

        const srcTxids = await xfer.initiateTransfer(route.source.signer);
        console.log(`Source Trasaction ID: ${srcTxids[0]}`);

        await xfer.fetchAttestation(60_000);

        const destTxids = await xfer.completeTransfer(route.destination.signer);
        console.log(`Completed Transfer: `, destTxids);
    }


    process.exit(0);
})();

