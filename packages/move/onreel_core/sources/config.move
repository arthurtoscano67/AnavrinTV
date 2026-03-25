module onreel::config {
    use std::string::String;
    use sui::event;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    use onreel::platform_admin;

    public struct FeeConfig has store, copy, drop {
        upload_flat_mist: u64,
        upload_percent_bps: u16,
        renewal_flat_mist: u64,
        renewal_percent_bps: u16,
        rental_fee_bps: u16,
        purchase_fee_bps: u16,
        tip_fee_bps: u16,
        ad_creator_payout_bps: u16,
        payout_min_mist: u64,
    }

    public struct RuleOverride has store, copy, drop {
        selector_type: u8,
        selector_hash: vector<u8>,
        start_epoch: u64,
        end_epoch: u64,
        fee: FeeConfig,
    }

    public struct ConfigStore has key {
        id: UID,
        version: u64,
        global_defaults: FeeConfig,
        creator_tier_defaults: vector<FeeConfig>,
        campaign_defaults: vector<FeeConfig>,
        individual_overrides: vector<RuleOverride>,
        manual_overrides: vector<RuleOverride>,
        emergency_overrides: vector<RuleOverride>,
        note: String,
    }

    public struct ConfigPublished has copy, drop {
        version: u64,
        editor: address,
    }

    public entry fun init(admin: &platform_admin::PlatformAdmin, note: String, ctx: &mut TxContext) {
        platform_admin::assert_admin(admin, tx_context::sender(ctx));

        let store = ConfigStore {
            id: object::new(ctx),
            version: 1,
            global_defaults: FeeConfig {
                upload_flat_mist: 0,
                upload_percent_bps: 0,
                renewal_flat_mist: 0,
                renewal_percent_bps: 0,
                rental_fee_bps: 0,
                purchase_fee_bps: 0,
                tip_fee_bps: 0,
                ad_creator_payout_bps: 6000,
                payout_min_mist: 100000000,
            },
            creator_tier_defaults: vector::empty<FeeConfig>(),
            campaign_defaults: vector::empty<FeeConfig>(),
            individual_overrides: vector::empty<RuleOverride>(),
            manual_overrides: vector::empty<RuleOverride>(),
            emergency_overrides: vector::empty<RuleOverride>(),
            note,
        };

        transfer::share_object(store);
    }

    public entry fun publish(
        admin: &platform_admin::PlatformAdmin,
        store: &mut ConfigStore,
        global_defaults: FeeConfig,
        note: String,
        ctx: &TxContext,
    ) {
        platform_admin::assert_admin(admin, tx_context::sender(ctx));

        store.version = store.version + 1;
        store.global_defaults = global_defaults;
        store.note = note;

        event::emit(ConfigPublished {
            version: store.version,
            editor: tx_context::sender(ctx),
        });
    }

    public fun current_version(store: &ConfigStore): u64 {
        store.version
    }
}
