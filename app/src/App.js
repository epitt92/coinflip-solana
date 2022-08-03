import './App.css';
import { useState } from 'react';
import { Connection, PublicKey, clusterApiUrl, Transaction } from '@solana/web3.js';
import {
  Program, Provider, web3
} from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';
import idl from './idl.json';

import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

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
const stateAccount = Keypair.generate();
const baseAccount = Keypair.generate();
const tokenVault = Keypair.generate();
const opts = {
  preflightCommitment: "processed"
}
const programID = new PublicKey(idl.metadata.address);

const network = clusterApiUrl('devnet');

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
    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl, programID, provider);

    let mintAddress = await createMint(provider.connection);

    let mintA = null;
    let mintB = null;
    let initializerTokenAccountA = null;
    let initializerTokenAccountB = null;
    let takerTokenAccountA = null;
    let takerTokenAccountB = null;
    let vault_account_pda = null;
    let vault_account_bump = null;
    let vault_authority_pda = null;
  
    const takerAmount = 1000;
    const initializerAmount = 500000000;
    0.000000001 
    const escrowAccount = anchor.web3.Keypair.generate();
    const payer = anchor.web3.Keypair.generate();
    const mintAuthority = anchor.web3.Keypair.generate();
    const initializerMainAccount = anchor.web3.Keypair.generate();
    const takerMainAccount = anchor.web3.Keypair.generate();

    console.log(escrowAccount.publicKey.toBase58())
    console.log(payer.publicKey.toBase58())
    console.log(initializerMainAccount.publicKey.toBase58())
    console.log(takerMainAccount.publicKey.toBase58())

    try {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(payer.publicKey, 1000000000),
        "processed"
      );

      alert('airdrop success')
      console.log('airdrop success')

      // Fund Main Accounts
      await provider.send(
        (() => {
          const tx = new Transaction();
          tx.add(
            SystemProgram.transfer({
              fromPubkey: payer.publicKey,
              toPubkey: initializerMainAccount.publicKey,
              lamports: 100000000,
            }),
            SystemProgram.transfer({
              fromPubkey: payer.publicKey,
              toPubkey: takerMainAccount.publicKey,
              lamports: 100000000,
            })
          );
          return tx;
        })(),
        [payer]
      );
      console.log("transfer success")
      mintA = await spl.Token.createMint(
        provider.connection,
        payer,
        mintAuthority.publicKey,
        null,
        0,
        TOKEN_PROGRAM_ID
      );
  
      mintB = await spl.Token.createMint(
        provider.connection,
        payer,
        mintAuthority.publicKey,
        null,
        0,
        TOKEN_PROGRAM_ID
      );
      
      console.log(mintA, mintB)
      initializerTokenAccountA = await mintA.createAccount(initializerMainAccount.publicKey);
      takerTokenAccountA = await mintA.createAccount(takerMainAccount.publicKey);
   
      console.log("A token Acc: ", initializerTokenAccountA.toBase58(), takerTokenAccountA.toBase58())
  
      initializerTokenAccountB = await mintB.createAccount(initializerMainAccount.publicKey);
      takerTokenAccountB = await mintB.createAccount(takerMainAccount.publicKey);

      console.log("B token Acc: ", initializerTokenAccountB.toBase58(), takerTokenAccountB.toBase58())
  
      await mintA.mintTo(
        initializerTokenAccountA,
        mintAuthority.publicKey,
        [mintAuthority],
        initializerAmount
      );
  
      await mintB.mintTo(
        takerTokenAccountB,
        mintAuthority.publicKey,
        [mintAuthority],
        takerAmount
      );

      let _initializerTokenAccountA = await mintA.getAccountInfo(initializerTokenAccountA);
      let _takerTokenAccountB = await mintB.getAccountInfo(takerTokenAccountB);
    
      const [_vault_account_pda, _vault_account_bump] = await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("token-seed"))],
        program.programId
      );
      vault_account_pda = _vault_account_pda;
      vault_account_bump = _vault_account_bump;
      const [_vault_authority_pda, _vault_authority_bump] = await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("escrow"))],
        program.programId
      );
      vault_authority_pda = _vault_authority_pda;
  
      await program.rpc.initialize(
        vault_account_bump,
        new anchor.BN(initializerAmount),
        {
          accounts: {
            initializer: provider.wallet.publicKey,
            vaultAccount: vault_account_pda,
            escrowAccount: escrowAccount.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
          instructions: [
            await program.account.escrowAccount.createInstruction(escrowAccount),
          ],
          signers: [escrowAccount],
        }
      );
  
      let _escrowAccount = await program.account.escrowAccount.fetch(
        escrowAccount.publicKey
      );
  
      // const [vaultKey, vaultBump] = await PublicKey.findProgramAddress([anchor.utils.bytes.utf8.encode("user-wallet")], programID);
      
      // const [statePDA, stateBump] = await PublicKey.findProgramAddress([], program.programId);
      
      // const amount = new anchor.BN(0);
      // // console.log("vaultss", vaultKey.toBase58(), vaultBump)
      // await program.rpc.initialize(stateBump, {
      //   accounts: {
      //     coinFlip: statePDA,
      //     tokenVault: statePDA,
      //     tokenMint: mintAddress,
      //     signer: provider.wallet.publicKey,
      //     poolSigner: statePDA,
      //     systemProgram: SystemProgram.programId
      //   }
      // });
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