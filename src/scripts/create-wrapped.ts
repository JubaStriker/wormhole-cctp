import { Wormhole, signSendWait, wormhole } from '@wormhole-foundation/sdk';
import evm from '@wormhole-foundation/sdk/evm';
import solana from '@wormhole-foundation/sdk/solana';
import sui from '@wormhole-foundation/sdk/sui';
import { inspect } from 'util';
import { getSigner } from '../helpers/helpers';

(async function () {
    const wh = await wormhole('Testnet', [evm, solana, sui]);

    const srcChain = wh.getChain('ArbitrumSepolia');
    const destChain = wh.getChain('BaseSepolia');
    const token = await srcChain.getNativeWrappedTokenId();
    const gasLimit = BigInt(2_500_000);

    const { signer: destSigner } = await getSigner(destChain, gasLimit);

    const tbDest = await destChain.getTokenBridge();

    try {
        const wrapped = await tbDest.getWrappedAsset(token);
        console.log(
            `Token already wrapped on ${destChain.chain}. Skipping attestation.`
        );
        return { chain: destChain.chain, address: wrapped };
    } catch (e) {
        console.log(
            `No wrapped token found on ${destChain.chain}. Proceeding with attestation.`
        );
    }

    const { signer: origSigner } = await getSigner(srcChain);

    const tbOrig = await srcChain.getTokenBridge();
    const attestTxns = tbOrig.createAttestation(
        token.address,
        Wormhole.parseAddress(origSigner.chain(), origSigner.address())
    );

    const txids = await signSendWait(srcChain, attestTxns, origSigner);
    console.log('txids: ', inspect(txids, { depth: null }));
    const txid = txids[0]!.txid;
    console.log('Created attestation (save this): ', txid);

    const msgs = await srcChain.parseTransaction(txid);
    console.log('Parsed Messages:', msgs);

    const timeout = 25 * 60 * 1000;
    const vaa = await wh.getVaa(msgs[0]!, 'TokenBridge:AttestMeta', timeout);
    if (!vaa) {
        throw new Error(
            'VAA not found after retries exhausted. Try extending the timeout.'
        );
    }

    const subAttestation = tbDest.submitAttestation(
        vaa,
        Wormhole.parseAddress(destSigner.chain(), destSigner.address())
    );

    const tsx = await signSendWait(destChain, subAttestation, destSigner);

    async function waitForIt() {
        do {
            try {
                const wrapped = await tbDest.getWrappedAsset(token);
                return { chain: destChain.chain, address: wrapped };
            } catch (e) {
                console.error('Wrapped asset not found yet. Retrying...');
            }
            console.log('Waiting before checking again...');
            await new Promise((r) => setTimeout(r, 2000));
        } while (true);
    }

    console.log('Wrapped Asset: ', await waitForIt());

})().catch((e) => console.error(e));