const STORAGE = "https://mbybrzggrpyhvcnxhlua.supabase.co/storage/v1/object/public/assets";

export const VIDEO = {
  // hero-bg.mp4 must be compressed to <50MB before uploading.
  // Compress with: ffmpeg -i hero-bg.mp4 -vf scale=1280:-2 -crf 28 -preset fast hero-bg-compressed.mp4
  // Then upload to Supabase Storage bucket 'assets' and uncomment the line below.
  heroBg:     "",
  // heroBg:  `${STORAGE}/hero-bg.mp4`,
  ctaBg:      `${STORAGE}/cta-bg.mp4`,
  networkBg:  `${STORAGE}/network-bg.mp4`,
  sectionBg:  `${STORAGE}/section-bg.mp4`,
};
