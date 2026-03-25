module onreel::access {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;

    public struct RentalPass has key, store {
        id: UID,
        video_id: address,
        renter: address,
        start_epoch: u64,
        end_epoch: u64,
    }

    public struct PurchaseLicense has key, store {
        id: UID,
        video_id: address,
        owner: address,
        perpetual: bool,
    }

    public entry fun mint_rental_pass(
        video_id: address,
        renter: address,
        start_epoch: u64,
        end_epoch: u64,
        ctx: &mut TxContext,
    ) {
        let pass = RentalPass {
            id: object::new(ctx),
            video_id,
            renter,
            start_epoch,
            end_epoch,
        };

        transfer::public_transfer(pass, renter);
    }

    public entry fun mint_purchase_license(
        video_id: address,
        owner: address,
        perpetual: bool,
        ctx: &mut TxContext,
    ) {
        let license = PurchaseLicense {
            id: object::new(ctx),
            video_id,
            owner,
            perpetual,
        };

        transfer::public_transfer(license, owner);
    }

    public fun rental_active(pass: &RentalPass, now_epoch: u64): bool {
        now_epoch >= pass.start_epoch && now_epoch < pass.end_epoch
    }

    public fun rental_video_id(pass: &RentalPass): address {
        pass.video_id
    }

    public fun rental_renter(pass: &RentalPass): address {
        pass.renter
    }

    public fun purchase_video_id(license: &PurchaseLicense): address {
        license.video_id
    }

    public fun purchase_owner(license: &PurchaseLicense): address {
        license.owner
    }
}
