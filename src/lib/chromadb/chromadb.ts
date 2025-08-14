// import type { NextApiRequest, NextApiResponse } from "next";
import { CloudClient, Collection } from "chromadb";

let chromaClient = new CloudClient();
let myCollection: Collection | null = null;

export const getChromaClient = () => {
  if (!chromaClient) {
    chromaClient = new CloudClient();
  }
  return chromaClient;
}

export const getMyCollection = async () => {
  if (!myCollection) {
    myCollection = await chromaClient.getOrCreateCollection({
      name: "spotify_songs",
    });
  }
  return myCollection;
};

