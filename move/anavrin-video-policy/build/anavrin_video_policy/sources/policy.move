module anavrin::policy;

use sui::clock::Clock;
use sui::transfer;
use sui::tx_context::TxContext;
use sui::object;

const VERSION: u64 = 1;
const DAY_MS: u64 = 86_400_000;

const VISIBILITY_DRAFT: u8 = 0;
const VISIBILITY_PRIVATE: u8 = 1;
const VISIBILITY_PUBLIC: u8 = 2;

const ENoAccess: u64 = 1;
const EInvalidCap: u64 = 2;
const EExpired: u64 = 3;
const EWrongVersion: u64 = 4;

public struct VideoPolicy has key, store {
    id: UID,
    version: u64,
    owner: address,
    visibility: u8,
    published: bool,
    nonce: vector<u8>,
    ttl_days: u64,
    expires_at_ms: u64,
    title: vector<u8>,
    slug: vector<u8>,
}

public struct Cap has key, store {
    id: UID,
    policy_id: ID,
}

fun cap_matches(policy: &VideoPolicy, cap: &Cap): bool {
    cap.policy_id == object::id(policy)
}

fun matches_identity(owner: address, nonce: &vector<u8>, id: &vector<u8>): bool {
    let owner_bytes = owner.to_bytes();
    let expected_len = owner_bytes.length() + nonce.length();
    if (id.length() != expected_len) {
        return false;
    };

    let mut index = 0;
    while (index < owner_bytes.length()) {
        if (owner_bytes[index] != id[index]) {
            return false;
        };
        index = index + 1;
    };

    let mut nonce_index = 0;
    while (nonce_index < nonce.length()) {
        if (nonce[nonce_index] != id[owner_bytes.length() + nonce_index]) {
            return false;
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

fun check_policy(id: vector<u8>, policy: &VideoPolicy, c: &Clock, ctx: &TxContext): bool {
    assert!(policy.version == VERSION, EWrongVersion);
    if (!matches_identity(policy.owner, &policy.nonce, &id)) {
        return false;
    };

    if (c.timestamp_ms() > policy.expires_at_ms) {
        return false;
    };

    if (policy.visibility == VISIBILITY_PUBLIC && policy.published) {
        return true;
    };

    if (policy.visibility == VISIBILITY_DRAFT || policy.visibility == VISIBILITY_PRIVATE) {
        return ctx.sender() == policy.owner;
    };

    ctx.sender() == policy.owner
}

entry fun seal_approve(id: vector<u8>, policy: &VideoPolicy, c: &Clock, ctx: &TxContext) {
    assert!(check_policy(id, policy, c, ctx), ENoAccess);
}
