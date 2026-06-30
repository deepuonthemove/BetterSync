import React from "react";
import ConverterClient from "./ConverterClient";

export const metadata = {
  title: "BetterSync - Convert YouTube to Spotify Playlists",
  description: "Transfer your favorite playlists, tracks, and YouTube-generated radios directly into Spotify. Fast, secure, and powered by Better Auth.",
};

export default async function Page() {
  return <ConverterClient />;
}
