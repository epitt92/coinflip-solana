
use anchor_lang::{prelude::*, solana_program::system_program};
use anchor_lang::solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
    sysvar::Sysvar,
};

declare_id!("EVLUk8YzxevK24RRHEos5WxcXTqx8dDu79Xa4gGkQKMU");

#[program]
pub mod lock {
    use anchor_lang::solana_program::{
        lamports,
        program::{invoke, invoke_signed},
        system_instruction::{transfer , assign_with_seed, assign}
    };

    use super::*;

    const ESCROW_PDA_SEED: &[u8] = b"vault-testaccount";

    pub fn initialize(ctx: Context<Initialize>,bump: u8, authority: Pubkey) -> ProgramResult {
        let lock_account = &mut ctx.accounts.lock_account;
        //let tx  = &assign(lock_account.to_account_info().key, ctx.accounts.owner.to_account_info().key);
        lock_account.authority = authority;
        lock_account.owner = *ctx.accounts.owner.key;
        lock_account.locked = false;
        lock_account.bump = bump;
        lock_account.win_returns = 90;
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

        // let transfer_instruction = &transfer(
        //     &ctx.accounts.pool_signer.key,
        //     &lock_account.owner,
        //     lamports,
        // );
        msg!("Withdrawing {}", lamports);

        **ctx.accounts.escrow_account.try_borrow_mut_lamports()? -= lamports;
        **ctx.accounts.owner.try_borrow_mut_lamports()? += lamports;
        Ok(())

        // invoke_signed(
        //     transfer_instruction,
        //     &[
        //         ctx.accounts.pool_signer.to_account_info(),
        //         ctx.accounts.owner.to_account_info(),
        //         ctx.accounts.lock_program.to_account_info(),
        //         ctx.accounts.system_program.to_account_info()
        //     ],
        //     pool_signer,
        // )
    }

    pub fn payin(ctx: Context<Payin>, lamports: u64) -> ProgramResult {
        let lock_account = &mut ctx.accounts.lock_account;
            
        let transfer_instruction = &transfer(
            &lock_account.owner,
            &ctx.accounts.escrow_account.key,
            lamports,
        );
        msg!("Paying in {}", lamports);
        invoke(
            transfer_instruction,
            &[
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.escrow_account.to_account_info(),       
            ]
        )
    }

    pub fn bet(ctx: Context<Bet>, is_head :u8, amount: u64) -> ProgramResult {

        let lock_account = &mut ctx.accounts.lock_account;
        let c = Clock::get().unwrap();

        // Transfer tokens into the token vault.
        let transfer_instruction = &transfer(
            &ctx.accounts.owner.key,
            &ctx.accounts.escrow_account.key,
            amount,
        );
        msg!("Paying in {}", amount);
        invoke(
            transfer_instruction,
            &[
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.escrow_account.to_account_info(),       
            ]
        );

        let award_amount :u64;
        
        // if (c.unix_timestamp % 2) == is_head.into() {
            if ctx.accounts.escrow_account.lamports() < ((amount * (lock_account.win_returns as u64))/100) {
                msg!("Congratulations, You won! Sry, we didn't have enough reward to gib you. So, we'll gib you all the remaining reward in the vault");

                // Transfer tokens from the vault to user vault.
                award_amount = ctx.accounts.escrow_account.lamports();

            } else {
                // Transfer tokens from the vault to user vault.
                award_amount = (100 + lock_account.win_returns as u64)/100;
                msg!("Congratulations, You won!");
            }

            msg!("award amount {}", award_amount);
            **ctx.accounts.escrow_account.try_borrow_mut_lamports()? -= award_amount;
            **ctx.accounts.owner.try_borrow_mut_lamports()? += award_amount;
        // } else {
        //     msg!("Sorry, You lost!");
        // }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Initialize<'info> {
    #[account(init,
    payer=owner,
    space= 32 + 8 + 32 + 32 + 1 + 1 ,
    seeds=[b"base-testaccount".as_ref()],
    bump)
    ]
    pub lock_account: Account<'info, LockAccount>,
    #[account(init,
    payer=owner,
    space=0,
    seeds=[b"vault-testaccount".as_ref()],
    bump)
    ]
    pub escrow_account: AccountInfo<'info>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unlock<'info> {
    #[account(mut, has_one = authority)]
    pub lock_account: Account<'info, LockAccount>,
    #[account(signer)]
    pub authority: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub lock_account: Account<'info, LockAccount>,
    #[account(signer)]
    pub owner: AccountInfo<'info>,
    #[account(mut)]
    pub escrow_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Bet<'info> {
    #[account(mut)]
    pub lock_account: Account<'info, LockAccount>,
    #[account(signer)]
    pub owner: AccountInfo<'info>,
    #[account(mut)]
    pub escrow_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Payin<'info> {
    #[account(mut)]
    pub lock_account: Account<'info, LockAccount>,
    #[account(mut)]
    pub escrow_account: AccountInfo<'info>,
    #[account(signer)]
    pub owner: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct LockAccount {
    pub owner: Pubkey,
    pub authority: Pubkey,
    pub locked: bool,
    pub win_returns: u8,
    bump: u8,
}