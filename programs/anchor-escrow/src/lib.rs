use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Mint, SetAuthority, TokenAccount, Transfer};
use spl_token::instruction::AuthorityType;
use anchor_lang::solana_program::{
    account_info::{AccountInfo},
    entrypoint::ProgramResult,
    pubkey::Pubkey,
};

declare_id!("8uay33TErnMNRYFrsQTGsXqK1jzSZq9hDXGvEZAACPmd");

#[program]
pub mod anchor_escrow {
    use super::*;

    const ESCROW_PDA_SEED: &[u8] = b"cointest";

    pub fn initialize(
        ctx: Context<Initialize>,
        _vault_account_bump: u8,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.escrow_account.initializer_key = *ctx.accounts.initializer.key;
        ctx.accounts.escrow_account.vault_account = *ctx.accounts.vault_account.key;
        
        ctx.accounts.escrow_account.amount = amount;
        ctx.accounts.escrow_account.bump = _vault_account_bump;
        ctx.accounts.escrow_account.taker_amount = amount/2;

        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.initializer.key(),
            &ctx.accounts.vault_account.key(),
            amount,
        );

        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.initializer.to_account_info(),
                ctx.accounts.vault_account.to_account_info(),
            ],
        );
        let authority_seeds = &[&ESCROW_PDA_SEED[..], &[_vault_account_bump]];
        // token::set_authority(
        //     ctx.accounts.into_set_authority_context(),
        //     AuthorityType::AccountOwner,
        //     Some(vault_authority),
        // )?;

        ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.vault_account.key(),
            &ctx.accounts.initializer.key(),
            ctx.accounts.escrow_account.taker_amount,
        );
        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.vault_account.to_account_info(),
                ctx.accounts.initializer.to_account_info(),
            ],
            &[&authority_seeds[..]]
        )?;
        Ok(())
    }

    pub fn calculate(
        ctx: Context<Calc>,
    ) -> Result<()> {
        let escrow_account = &mut ctx.accounts.escrow_account;

        let authority_seeds = &[&ESCROW_PDA_SEED[..], &[escrow_account.bump]];
        // token::set_authority(
        //     ctx.accounts.into_set_authority_context(),
        //     AuthorityType::AccountOwner,
        //     Some(vault_authority),
        // )?;

        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.vault_account.key(),
            &ctx.accounts.initializer.key(),
            ctx.accounts.escrow_account.taker_amount,
        );
        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.vault_account.to_account_info(),
                ctx.accounts.initializer.to_account_info(),
            ],
            &[&authority_seeds[..]]
        )?;

        Ok(())
    }

}

#[derive(Accounts)]
#[instruction(vault_account_bump: u8, amount: u64)]
pub struct Initialize<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, signer)]
    pub initializer: AccountInfo<'info>,
    #[account(mut)]
    pub vault_account: AccountInfo<'info>,
    #[account(zero)]
    pub escrow_account: Box<Account<'info, EscrowAccount>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub system_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Calc<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub initializer: AccountInfo<'info>,
    #[account(mut)]
    pub vault_account: AccountInfo<'info>,
    #[account(mut)]
    pub escrow_account: Box<Account<'info, EscrowAccount>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub system_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_program: AccountInfo<'info>,
}

#[account]
pub struct EscrowAccount {
    pub initializer_key: Pubkey,
    pub vault_account: Pubkey,
    pub amount: u64,
    pub bump: u8,
    pub taker_amount: u64,
}