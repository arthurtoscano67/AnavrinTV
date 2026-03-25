module onreel::platform_admin {
    use sui::event;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    const E_NOT_ADMIN: u64 = 1;

    public struct PlatformAdmin has key {
        id: UID,
        owner: address,
        upload_paused: bool,
        playback_paused: bool,
        payouts_paused: bool,
        emergency_mode: bool,
    }

    public struct EmergencyModeChanged has copy, drop {
        admin: address,
        emergency_mode: bool,
    }

    public entry fun init(owner: address, ctx: &mut TxContext) {
        let admin = PlatformAdmin {
            id: object::new(ctx),
            owner,
            upload_paused: false,
            playback_paused: false,
            payouts_paused: false,
            emergency_mode: false,
        };
        transfer::share_object(admin);
    }

    public fun assert_admin(admin: &PlatformAdmin, sender: address) {
        assert!(admin.owner == sender, E_NOT_ADMIN);
    }

    public entry fun set_emergency_mode(admin: &mut PlatformAdmin, emergency_mode: bool, ctx: &TxContext) {
        assert_admin(admin, tx_context::sender(ctx));
        admin.emergency_mode = emergency_mode;

        event::emit(EmergencyModeChanged {
            admin: tx_context::sender(ctx),
            emergency_mode,
        });
    }

    public fun emergency_mode(admin: &PlatformAdmin): bool {
        admin.emergency_mode
    }
}
