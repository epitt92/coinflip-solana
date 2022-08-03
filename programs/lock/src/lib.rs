use anchor_lang::{prelude::*, solana_program::system_program};

declare_id!("EVLUk8YzxevK24RRHEos5WxcXTqx8dDu79Xa4gGkQKMU");

#[program]
pub mod lock {
    use anchor_lang::solana_program::{
        lamports,
        program::{invoke, invoke_signed},
        system_instruction::{transfer , assign_with_seed, assign}
    };

    use super::*;

    const ESCROW_PDA_SEED: &[u8] = b"escrow-account";

    pub fn initialize(ctx: Context<Initialize>, bump: u8, authority: Pubkey) -> ProgramResult {
        let lock_account = &mut ctx.accounts.lock_account;
        //let tx  = &assign(lock_account.to_account_info().key, ctx.accounts.owner.to_account_info().key);
        lock_account.authority = authority;
        lock_account.locked = false;
        lock_account.bump = bump;
        Ok(())
    }
    pub fn unlock(ctx: Context<Unlock>) -> ProgramResult {
        let lock_account = &mut ctx.accounts.lock_account;
        lock_account.locked = false;
        Ok(())
    }
    pub fn lock(ctx: Context<Unlock>) -> ProgramResult {
        let lock_account = &mut ctx.accounts.lock_account;
        lock_account.locked = true;
        Ok(())
    }
    pub fn withdraw(ctx: Context<Withdraw>, lamports: u64) -> ProgramResult {
        let lock_account = &mut ctx.accounts.lock_account;
        let transfer_instruction = &transfer(
            ctx.accounts.escrow_account.key,
            &lock_account.to_account_info().key,
            lamports,
        );
        msg!("Withdrawing {}", lamports);

        let authority_seeds = &[&ESCROW_PDA_SEED[..], &[lock_account.bump]];

        invoke_signed(
            transfer_instruction,
            &[
                ctx.accounts.escrow_account.to_account_info(),
                lock_account.to_account_info(),
                ctx.accounts.system_program.to_account_info()
            ],
            &[&authority_seeds[..]],
        )
    }

    pub fn payin(ctx: Context<Payin>, lamports: u64) -> ProgramResult {
        let lock_account = &mut ctx.accounts.lock_account;
        let transfer_instruction = &transfer(
            &lock_account.to_account_info().key,
            ctx.accounts.escrow_account.key,
            lamports,
        );
        msg!("Paying in {}", lamports);
        invoke(
            transfer_instruction,
            &[
                lock_account.to_account_info(),
                ctx.accounts.escrow_account.to_account_info(),       
            ]
        )
    }
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Initialize<'info> {
    #[account(mut, signer)]
    pub lock_account: Account<'info, LockAccount>,
    #[account(init,
    payer=lock_account,
    space=0,
    seeds=[b"escrow-account".as_ref()],
    bump)
    ]
    pub escrow_account: AccountInfo<'info>,
    #[account(mut)]
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unlock<'info> {
    #[account(mut)]
    pub lock_account: Account<'info, LockAccount>,
    #[account(signer)]
    pub authority: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, signer)]
    pub lock_account: Account<'info, LockAccount>,
    #[account(mut,constraint = !lock_account.locked)]
    pub escrow_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,

}

#[derive(Accounts)]
pub struct Payin<'info> {
    #[account(mut, signer)]
    pub lock_account: Account<'info, LockAccount>,
    #[account(mut)]
    pub escrow_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct LockAccount {
    pub authority: Pubkey,
    pub locked: bool,
    bump: u8,
}


