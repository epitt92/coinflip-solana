import './App.css';
import { useState } from 'react';
import { Connection, PublicKey, clusterApiUrl, Transaction } from '@solana/web3.js';
import {
  Program, Provider, web3
} from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';

import idl from './idl.json';

import { TOKEN_PROGRAM_ID, BN } from "@solana/spl-token";

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

const network = clusterApiUrl('testnet');

function App() {
  const [value, setValue] = useState(0.05);
  const wallet = useWallet();
  
  const initializerAmount = 10000000;
  async function getProvider() {
    
    // const network = "https://api.testnet.solana.com";
    const connection = new Connection(network, opts.preflightCommitment);

    const provider = new Provider(
      connection, wallet, opts.preflightCommitment,
    );
    return provider;
  }

  async function Bet(is_head) {    
    console.log('started')
    const provider = await getProvider()
    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl, programID, provider);
    const amount = value * anchor.web3.LAMPORTS_PER_SOL;
    try {
      const [lock_account, _escrow_account_bump] = await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("base-testaccount"))],
        program.programId
      );
      const [escrow_account, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("vault-testaccount"))],
        program.programId
      );
      // Execute the RPC call
      const txt = await program.rpc.bet( is_head,		
        new anchor.BN(amount),
        {
        accounts: {
          lockAccount: lock_account, // publickey for our new account
          owner: provider.wallet.publicKey,
          escrowAccount: escrow_account,
          systemProgram: SystemProgram.programId // just for Anchor reference
        },
        signers: [provider.wallet.keypair]// acc must sign this Tx, to prove we have the private key too
      });
      console.log(txt)
      console.log(
        `Successfully withdraw from lock ID: ${lock_account}`
      );
      let getTxReq = {
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [
          txt,
          "json"
        ]
      }
      let res = await fetch(network, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(getTxReq)
      });
      const resData = await res.json();
      console.log(resData);
    } catch (err) {
      if(String(err).indexOf('Network request failed') !== -1){
        alert('Network Error');
      }
    }
  }
  async function Initialize() {    
    const provider = await getProvider()
    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl, programID, provider);
  
    try {
      const [lock_account, _escrow_account_bump] = await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("base-testaccount"))],
        program.programId
      );
      const [escrow_account, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("vault-testaccount"))],
        program.programId
      );
      // Execute the RPC call
      console.log(lock_account.toBase58(), escrow_account.toBase58(), bump)
      
      const txi = await program.rpc.initialize(		
        bump,	
        90,
        provider.wallet.publicKey,
        {
        accounts: {
          lockAccount: lock_account, // publickey for our new account
          owner: provider.wallet.publicKey,
          escrowAccount: escrow_account,
          systemProgram: SystemProgram.programId // just for Anchor reference
        },
        signers: [provider.wallet.keypair]// acc must sign this Tx, to prove we have the private key too
      });
  
      console.log(
        `Successfully intialized lock ID: ${lock_account} for user ${provider.wallet.publicKey}`
      );
    } catch (err) {
      console.log("Transaction error: ", err);
    }
  }
  async function Deposit() {    
    const provider = await getProvider()
    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl, programID, provider);

    try {
      const [lock_account, _escrow_account_bump] = await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("base-testaccount"))],
        program.programId
      );
      const [escrow_account, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("vault-testaccount"))],
        program.programId
      );
      const tx2 = await program.rpc.payin(	
        new anchor.BN(5*initializerAmount),
        {
        accounts: {
          lockAccount: lock_account, // publickey for our new account
          owner: provider.wallet.publicKey,
          escrowAccount: escrow_account,
          systemProgram: SystemProgram.programId // just for Anchor reference
        },
        signers: [provider.wallet.keypair]// acc must sign this Tx, to prove we have the private key too
      });
      console.log(
        `Successfully payed in lock ID: ${lock_account}`
      );
    } catch (err) {
      console.log("Transaction error: ", err);
    }
  }
  async function Unlock() {    
    const provider = await getProvider()
    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl, programID, provider);

    try {
      const [lock_account, _escrow_account_bump] = await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("base-testaccount"))],
        program.programId
      );
      const [escrow_account, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("vault-testaccount"))],
        program.programId
      );
      const tx1 = await program.rpc.unlock(		
        {
        accounts: {
          lockAccount: lock_account, // publickey for our new account
          authority: provider.wallet.publicKey, // publickey of our anchor wallet provider
          systemProgram: SystemProgram.programId // just for Anchor reference
        },
        signers: [provider.wallet.keypair]// acc must sign this Tx, to prove we have the private key too
      });
      console.log(
        `Successfully unlocked unlock ID: ${lock_account} with authority ${provider.wallet.publicKey}`
      );
    } catch (err) {
        console.log("Transaction error: ", err);
    }
  }
  async function Withdraw() {    
    const provider = await getProvider()
    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl, programID, provider);

    try {
      const [lock_account, _escrow_account_bump] = await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("base-testaccount"))],
        program.programId
      );
      const [escrow_account, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("vault-testaccount"))],
        program.programId
      );
      const tx = await program.rpc.withdraw(		
        new anchor.BN(initializerAmount/2),
        {
        accounts: {
          lockAccount: lock_account, // publickey for our new account
          owner: provider.wallet.publicKey,
          escrowAccount: escrow_account,
          systemProgram: SystemProgram.programId // just for Anchor reference
        },
        signers: [provider.wallet.keypair]// acc must sign this Tx, to prove we have the private key too
      });
      console.log(
        `Successfully withdraw from lock ID: ${lock_account}`
      );
    } catch (err) {
      console.log("Transaction error: ", err);
    }
  }

  if (!wallet.connected) {
    /* If the user's wallet is not connected, display connect wallet button. */
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop:'100px' }}>
        <WalletMultiButton />
      </div>
    )
  } else {
    let admin = (<div>
      <button onClick={Initialize}>Initialize</button>
      <button onClick={Deposit}>Deposit</button>
      <button onClick={Withdraw}>Withdraw</button>
      <button onClick={Unlock}>Unlock</button>
    </div>)
    return (
      <div className="App">
        <div>
          {wallet.publicKey.toBase58()==="GF8vm4xnizE4Po4LeBJakvo7xrH9MSBo12VTtLgSRv1f"?admin:<></>}
          <input onChange={e => setValue(e.target.value)} value={value} type={"number"} step="0.1" min="0.05" max="10"></input>
          <br />
          <h5>You will get {(value*1.9).toFixed(3)}</h5>
        </div>
        <div>
          <button onClick={e => Bet(0)}> Bet Head </button>
          <button onClick={e => Bet(1)}> Bet Tail </button>
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