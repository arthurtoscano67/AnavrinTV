module onreel::kiosk_integration {
    use sui::display;

    use onreel::video_asset::VideoAsset;

    public fun init_display_for_video_asset(
        display_obj: &mut display::Display<VideoAsset>,
        publisher: &display::Publisher,
    ) {
        display::add(display_obj, publisher, b"name", b"{title}");
        display::add(display_obj, publisher, b"description", b"{description}");
        display::add(display_obj, publisher, b"image_url", b"{thumbnail_url}");
        display::add(display_obj, publisher, b"thumbnail_url", b"{thumbnail_url}");
    }
}
