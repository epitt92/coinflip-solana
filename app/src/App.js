import './App.css';
import { useState } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import {
  Program, Provider, web3
} from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';
import idl from './idl.json';

import * as spl from '@solana/spl-token';

import { getPhantomWallet } from '@solana/wallet-adapter-wallets';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const wallets = [
  /* view list of available wallets at https://github.com/solana-labs/wallet-adapter#wallets */
  getPhantomWallet()
]

const { SystemProgram, Keypair } = web3;
/* create an account  */
const baseAccount = Keypair.generate();
const opts = {
  preflightCommitment: "processed"
}
const programID = new PublicKey(idl.metadata.address);

const network = clusterApiUrl('testnet');

function App() {
  const [value, setValue] = useState(null);
  const wallet = useWallet();
  async function getProvider() {

    // const network = "https://api.testnet.solana.com";
    const connection = new Connection(network, opts.preflightCommitment);

    const provider = new Provider(
      connection, wallet, opts.preflightCommitment,
    );
    return provider;
  }

  const createMint = async (connection) => {
    const provider = await getProvider()

    const tokenMint = new anchor.web3.Keypair();
    const lamportsForMint = await provider.connection.getMinimumBalanceForRentExemption(spl.MintLayout.span);
    let tx = new anchor.web3.Transaction();

    // Allocate mint
    tx.add(
        anchor.web3.SystemProgram.createAccount({
            programId: spl.TOKEN_PROGRAM_ID,
            space: spl.MintLayout.span,
            fromPubkey: provider.wallet.publicKey,
            newAccountPubkey: tokenMint.publicKey,
            lamports: lamportsForMint,
        })
    )
    // Allocate wallet account
    tx.add(
        spl.Token.createInitMintInstruction(
            spl.TOKEN_PROGRAM_ID,
            tokenMint.publicKey,
            6,
            provider.wallet.publicKey,
            provider.wallet.publicKey,
        )
    );
    const signature = await provider.send(tx, [tokenMint]);

    console.log(`[${tokenMint.publicKey}] Created new mint account at ${signature}`);
    return tokenMint.publicKey;
  }

  async function createCounter() {    
    console.log('started')
    const provider = await getProvider()
    let mintAddress = await createMint(provider.connection);

    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl, programID, provider);
    console.log(program.programId.toBase58())

    try {
      // const [vaultKey, vaultBump] = await PublicKey.findProgramAddress([anchor.utils.bytes.utf8.encode("user-wallet")], programID);
      
      // const [vaultAKey, vaultABump] = await PublicKey.findProgramAddress([anchor.utils.bytes.utf8.encode("user-stats")], programID);
      
      const amount = new anchor.BN(200000000);
      // console.log("vaultss", vaultKey.toBase58(), vaultBump)
      await program.rpc.initialize({
        accounts: {
          coinFlip: baseAccount.publicKey,
          tokenVault: baseAccount.publicKey,
          tokenMint: mintAddress,
          signer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        }
      });
      console.log('success');
      alert();
      // await program.rpc.betTail(amount, {
      //   accounts: {
      //     coinFlip: vaultKey,
      //     signer: provider.wallet.publicKey,
      //     tokenVault: vaultKey,
      //     stakeFromAccount: provider.wallet.publicKey,
      //     tokenProgram: spl.TOKEN_PROGRAM_ID,
      //     poolSigner: vaultKey
      //   }
      // });
      /* interact with the program via rpc */
      // await program.rpc.create({
      //   accounts: {
      //     baseAccount: baseAccount.publicKey,
      //     user: provider.wallet.publicKey,
      //     systemProgram: SystemProgram.programId,
      //   },
      //   signers: [baseAccount]
      // });

      // const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
      // console.log('account: ', account);
      // setValue(account.count.toString());
    } catch (err) {
      console.log("Transaction error: ", err);
    }
  }

  async function increment() {
    const provider = await getProvider();
    const program = new Program(idl, programID, provider);
    await program.rpc.increment({
      accounts: {
        baseAccount: baseAccount.publicKey
      }
    });

    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
    console.log('account: ', account);
    setValue(account.count.toString());
  }

  if (!wallet.connected) {
    /* If the user's wallet is not connected, display connect wallet button. */
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop:'100px' }}>
        <WalletMultiButton />
      </div>
    )
  } else {
    return (
      <div className="App">
        <div>
          {
            !value && (<button onClick={createCounter}>Create counter</button>)
          }
          {
            value && <button onClick={increment}>Increment counter</button>
          }

          {
            value && value >= Number(0) ? (
              <h2>{value}</h2>
            ) : (
              <h3>Please create the counter.</h3>
            )
          }
        </div>
      </div>
    );
  }
}

const AppWithProvider = () => (
  <ConnectionProvider endpoint={network}>
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <App />
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
)

export default AppWithProvider;