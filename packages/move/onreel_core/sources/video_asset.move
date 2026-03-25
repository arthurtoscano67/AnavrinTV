module onreel::video_asset {
    use std::string::String;
    use sui::event;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    public struct VideoAsset has key, store {
        id: UID,
        creator: address,
        channel_id: vector<u8>,
        title: String,
        description: String,
        thumbnail_url: String,
        walrus_manifest_blob_id: String,
        walrus_manifest_object_id: String,
        storage_end_epoch: u64,
        policy_object_id: address,
    }

    public struct VideoMinted has copy, drop {
        video_id: address,
        creator: address,
        storage_end_epoch: u64,
    }

    public entry fun mint(
        creator: address,
        channel_id: vector<u8>,
        title: String,
        description: String,
        thumbnail_url: String,
        walrus_manifest_blob_id: String,
        walrus_manifest_object_id: String,
        storage_end_epoch: u64,
        policy_object_id: address,
        ctx: &mut TxContext,
    ) {
        let video = VideoAsset {
            id: object::new(ctx),
            creator,
            channel_id,
            title,
            description,
            thumbnail_url,
            walrus_manifest_blob_id,
            walrus_manifest_object_id,
            storage_end_epoch,
            policy_object_id,
        };

        event::emit(VideoMinted {
            video_id: object::uid_to_address(&video.id),
            creator,
            storage_end_epoch,
        });

        transfer::public_transfer(video, creator);
    }

    public fun id(video: &VideoAsset): address {
        object::uid_to_address(&video.id)
    }

    public fun creator(video: &VideoAsset): address {
        video.creator
    }
}
