module onreel::seal_policy {
    use onreel::access::{Self, PurchaseLicense, RentalPass};
    use onreel::video_asset::VideoAsset;

    public fun owner_can_decrypt(video: &VideoAsset, tx_sender: address): bool {
        tx_sender == video_asset::creator(video)
    }

    public fun rental_can_decrypt(video: &VideoAsset, pass: &RentalPass, tx_sender: address, now_epoch: u64): bool {
        access::rental_video_id(pass) == video_asset::id(video)
            && access::rental_renter(pass) == tx_sender
            && access::rental_active(pass, now_epoch)
    }

    public fun purchase_can_decrypt(video: &VideoAsset, license: &PurchaseLicense, tx_sender: address): bool {
        access::purchase_video_id(license) == video_asset::id(video)
            && access::purchase_owner(license) == tx_sender
    }
}
