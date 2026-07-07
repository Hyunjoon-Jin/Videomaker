import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(null);
// Codec/quality for corporate playback per guide (H.264, high bitrate).
Config.setCodec("h264");
