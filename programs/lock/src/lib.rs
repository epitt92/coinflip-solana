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

    const ESCROW_PDA_SEED: &[u8] = b"flip-account";

    pub fn initialize(ctx: Context<Initialize>, lock_bump:u8, bump: u8, authority: Pubkey) -> ProgramResult {
        let lock_account = &mut ctx.accounts.lock_account;
        //let tx  = &assign(lock_account.to_account_info().key, ctx.accounts.owner.to_account_info().key);
        lock_account.authority = authority;
        lock_account.owner = *ctx.accounts.owner.key;
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

        let (_vault_authority, vault_authority_bump) =
            Pubkey::find_program_address(&[ESCROW_PDA_SEED], ctx.program_id);
            
        let transfer_instruction = &transfer(
            &ctx.accounts.escrow_account.key,
            &lock_account.owner,
            lamports,
        );
        msg!("Withdrawing {}", lamports);

        invoke_signed(
            transfer_instruction,
            &[
                ctx.accounts.escrow_account.to_account_info(),
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.system_program.to_account_info()
            ],
            &[&[&ESCROW_PDA_SEED[..], &[vault_authority_bump]]],
        )
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
}

#[derive(Accounts)]
#[instruction(lock_bump:u8, bump: u8)]
pub struct Initialize<'info> {
    #[account(init,
    payer=owner,
    space=8 + 32 + 32 + 1 + 1 ,
    seeds=[b"base-account".as_ref()],
    lock_bump)
    ]
    pub lock_account: Account<'info, LockAccount>,
    #[account(init,
    payer=owner,
    space=0,
    seeds=[b"flip-account".as_ref()],
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
    #[account(mut,constraint = !lock_account.locked)]
    pub lock_account: Account<'info, LockAccount>,
    #[account(mut)]
    pub escrow_account: AccountInfo<'info>,
    #[account(signer)]
    pub owner: AccountInfo<'info>,
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
    bump: u8,
}

