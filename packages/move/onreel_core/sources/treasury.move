module onreel::treasury {
    use std::string::String;
    use sui::balance::{Self, Balance};
    use sui::coin::Coin;
    use sui::event;
    use sui::object::{Self, UID};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    use onreel::platform_admin;

    public struct SponsorPool has key {
        id: UID,
        name: String,
        balance: Balance<SUI>,
        enabled: bool,
    }

    public struct SponsorConsumed has copy, drop {
        pool_id: address,
        amount_mist: u64,
        reason_code: u8,
    }

    public entry fun create_pool(
        admin: &platform_admin::PlatformAdmin,
        name: String,
        ctx: &mut TxContext,
    ) {
        platform_admin::assert_admin(admin, tx_context::sender(ctx));

        let pool = SponsorPool {
            id: object::new(ctx),
            name,
            balance: balance::zero<SUI>(),
            enabled: true,
        };

        transfer::share_object(pool);
    }

    public entry fun deposit(pool: &mut SponsorPool, coin: Coin<SUI>) {
        let bal = coin::into_balance(coin);
        balance::join(&mut pool.balance, bal);
    }

    public entry fun consume_for_sponsorship(
        admin: &platform_admin::PlatformAdmin,
        pool: &mut SponsorPool,
        amount_mist: u64,
        reason_code: u8,
        ctx: &TxContext,
    ) {
        platform_admin::assert_admin(admin, tx_context::sender(ctx));

        let _spent = balance::split(&mut pool.balance, amount_mist);

        event::emit(SponsorConsumed {
            pool_id: object::uid_to_address(&pool.id),
            amount_mist,
            reason_code,
        });
    }
}
