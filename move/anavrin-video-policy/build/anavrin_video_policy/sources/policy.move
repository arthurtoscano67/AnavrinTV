module anavrin::policy;

use sui::clock::Clock;
use sui::coin::{Self as coin, Coin};
use sui::kiosk;
use sui::sui::SUI;

const VERSION: u64 = 2;
const DAY_MS: u64 = 86_400_000;

const VISIBILITY_DRAFT: u8 = 0;
const VISIBILITY_PRIVATE: u8 = 1;
const VISIBILITY_PUBLIC: u8 = 2;

const ENoAccess: u64 = 1;
const EInvalidCap: u64 = 2;
const EExpired: u64 = 3;
const EWrongVersion: u64 = 4;
const ENoPurchaseOption: u64 = 5;
const ENoRentalOption: u64 = 6;
const EIncorrectPayment: u64 = 7;
const ENotPublished: u64 = 8;
const EInvalidEntitlement: u64 = 9;

public struct VideoPolicy has key, store {
    id: UID,
    version: u64,
    owner: address,
    visibility: u8,
    published: bool,
    nonce: vector<u8>,
    ttl_days: u64,
    expires_at_ms: u64,
    purchase_price_mist: u64,
    rental_price_mist: u64,
    rental_duration_days: u64,
    title: vector<u8>,
    slug: vector<u8>,
}

public struct Cap has key, store {
    id: UID,
    policy_id: ID,
}

public struct MovieLicense has key, store {
    id: UID,
    policy_id: ID,
    purchased_at_ms: u64,
}

public struct RentalPass has key, store {
    id: UID,
    policy_id: ID,
    rented_at_ms: u64,
    expires_at_ms: u64,
}

fun cap_matches(policy: &VideoPolicy, cap: &Cap): bool {
    cap.policy_id == object::id(policy)
}

fun matches_identity(owner: address, nonce: &vector<u8>, id: &vector<u8>): bool {
    let owner_bytes = owner.to_bytes();
    let expected_len = owner_bytes.length() + nonce.length();
    if (id.length() != expected_len) {
        return false
    };

    let mut index = 0;
    while (index < owner_bytes.length()) {
        if (owner_bytes[index] != id[index]) {
            return false
        };
        index = index + 1;
    };

    let mut nonce_index = 0;
    while (nonce_index < nonce.length()) {
        if (nonce[nonce_index] != id[owner_bytes.length() + nonce_index]) {
            return false
        };
        nonce_index = nonce_index + 1;
    };

    true
}

public fun create_video_policy_entry(
    visibility: u8,
    published: bool,
    nonce: vector<u8>,
    ttl_days: u64,
    purchase_price_mist: u64,
    rental_price_mist: u64,
    rental_duration_days: u64,
    title: vector<u8>,
    slug: vector<u8>,
    c: &Clock,
    ctx: &mut TxContext,
) {
    let effective_ttl_days = if (ttl_days == 0) { 1 } else { ttl_days };
    let policy = VideoPolicy {
        id: object::new(ctx),
        version: VERSION,
        owner: ctx.sender(),
        visibility,
        published,
        nonce,
        ttl_days: effective_ttl_days,
        expires_at_ms: c.timestamp_ms() + (effective_ttl_days * DAY_MS),
        purchase_price_mist,
        rental_price_mist,
        rental_duration_days: if (rental_price_mist == 0) { 0 } else if (rental_duration_days == 0) { 1 } else { rental_duration_days },
        title,
        slug,
    };
    let cap = Cap {
        id: object::new(ctx),
        policy_id: object::id(&policy),
    };

    transfer::share_object(policy);
    transfer::public_transfer(cap, ctx.sender());
}

public fun publish(policy: &mut VideoPolicy, cap: &Cap, c: &Clock) {
    assert!(cap_matches(policy, cap), EInvalidCap);
    policy.published = true;

    if (policy.expires_at_ms < c.timestamp_ms()) {
        policy.expires_at_ms = c.timestamp_ms() + (policy.ttl_days * DAY_MS);
    };
}

public fun unpublish(policy: &mut VideoPolicy, cap: &Cap) {
    assert!(cap_matches(policy, cap), EInvalidCap);
    policy.published = false;
}

public fun renew(policy: &mut VideoPolicy, cap: &Cap, days: u64, c: &Clock) {
    assert!(cap_matches(policy, cap), EInvalidCap);
    let effective_days = if (days == 0) { 1 } else { days };
    policy.ttl_days = effective_days;
    policy.expires_at_ms = c.timestamp_ms() + (effective_days * DAY_MS);
}

fun base_policy_allows(id: vector<u8>, policy: &VideoPolicy, c: &Clock): bool {
    assert!(policy.version == VERSION, EWrongVersion);
    if (c.timestamp_ms() > policy.expires_at_ms) {
        return false
    };

    if (!matches_identity(policy.owner, &policy.nonce, &id)) {
        return false
    };

    true
}

fun policy_active(policy: &VideoPolicy, c: &Clock): bool {
    assert!(policy.version == VERSION, EWrongVersion);
    c.timestamp_ms() <= policy.expires_at_ms
}

fun public_open_access(id: vector<u8>, policy: &VideoPolicy, c: &Clock, ctx: &TxContext): bool {
    if (!base_policy_allows(id, policy, c)) {
        return false
    };

    if (
        policy.visibility == VISIBILITY_PUBLIC
            && policy.published
            && policy.purchase_price_mist == 0
            && policy.rental_price_mist == 0
    ) {
        return true
    };

    if (policy.visibility == VISIBILITY_DRAFT || policy.visibility == VISIBILITY_PRIVATE) {
        return ctx.sender() == policy.owner
    };

    ctx.sender() == policy.owner
}

fun entitled_access(id: vector<u8>, policy: &VideoPolicy, c: &Clock, ctx: &TxContext): bool {
    if (!base_policy_allows(id, policy, c)) {
        return false
    };

    if (ctx.sender() == policy.owner) {
        return true
    };

    policy.published
}

fun valid_license(license: &MovieLicense, policy: &VideoPolicy): bool {
    license.policy_id == object::id(policy)
}

fun valid_rental(pass: &RentalPass, policy: &VideoPolicy, c: &Clock): bool {
    pass.policy_id == object::id(policy) && pass.expires_at_ms >= c.timestamp_ms()
}

entry fun seal_approve(id: vector<u8>, policy: &VideoPolicy, c: &Clock, ctx: &TxContext) {
    assert!(public_open_access(id, policy, c, ctx), ENoAccess);
}

public fun buy_license_entry(
    policy: &VideoPolicy,
    payment: Coin<SUI>,
    c: &Clock,
    ctx: &mut TxContext,
) {
    assert!(policy.purchase_price_mist > 0, ENoPurchaseOption);
    assert!(policy.published, ENotPublished);
    assert!(policy_active(policy, c), EExpired);
    assert!(coin::value(&payment) == policy.purchase_price_mist, EIncorrectPayment);

    let license = MovieLicense {
        id: object::new(ctx),
        policy_id: object::id(policy),
        purchased_at_ms: c.timestamp_ms(),
    };

    transfer::public_transfer(payment, policy.owner);
    transfer::public_transfer(license, ctx.sender());
}

public fun rent_video_entry(
    policy: &VideoPolicy,
    payment: Coin<SUI>,
    c: &Clock,
    ctx: &mut TxContext,
) {
    assert!(policy.rental_price_mist > 0, ENoRentalOption);
    assert!(policy.published, ENotPublished);
    assert!(policy_active(policy, c), EExpired);
    assert!(coin::value(&payment) == policy.rental_price_mist, EIncorrectPayment);

    let effective_days = if (policy.rental_duration_days == 0) { 1 } else { policy.rental_duration_days };
    let pass = RentalPass {
        id: object::new(ctx),
        policy_id: object::id(policy),
        rented_at_ms: c.timestamp_ms(),
        expires_at_ms: c.timestamp_ms() + (effective_days * DAY_MS),
    };

    transfer::public_transfer(payment, policy.owner);
    transfer::public_transfer(pass, ctx.sender());
}

entry fun seal_approve_with_license(
    id: vector<u8>,
    policy: &VideoPolicy,
    license: &MovieLicense,
    c: &Clock,
    ctx: &TxContext,
) {
    assert!(entitled_access(id, policy, c, ctx), ENoAccess);
    assert!(valid_license(license, policy), EInvalidEntitlement);
}

entry fun seal_approve_with_rental(
    id: vector<u8>,
    policy: &VideoPolicy,
    pass: &RentalPass,
    c: &Clock,
    ctx: &TxContext,
) {
    assert!(entitled_access(id, policy, c, ctx), ENoAccess);
    assert!(valid_rental(pass, policy, c), EInvalidEntitlement);
}

entry fun seal_approve_with_kiosk_license(
    id: vector<u8>,
    policy: &VideoPolicy,
    user_kiosk: &kiosk::Kiosk,
    kiosk_cap: &kiosk::KioskOwnerCap,
    license_id: ID,
    c: &Clock,
    ctx: &TxContext,
) {
    let license = kiosk::borrow<MovieLicense>(user_kiosk, kiosk_cap, license_id);
    assert!(entitled_access(id, policy, c, ctx), ENoAccess);
    assert!(valid_license(license, policy), EInvalidEntitlement);
}

entry fun seal_approve_with_kiosk_rental(
    id: vector<u8>,
    policy: &VideoPolicy,
    user_kiosk: &kiosk::Kiosk,
    kiosk_cap: &kiosk::KioskOwnerCap,
    pass_id: ID,
    c: &Clock,
    ctx: &TxContext,
) {
    let pass = kiosk::borrow<RentalPass>(user_kiosk, kiosk_cap, pass_id);
    assert!(entitled_access(id, policy, c, ctx), ENoAccess);
    assert!(valid_rental(pass, policy, c), EInvalidEntitlement);
}
