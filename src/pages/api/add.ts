import type { NextApiRequest, NextApiResponse } from "next";
import { CloudClient, Collection, Metadata } from "chromadb";

interface AddDataRequest {
  ids: string[];
  documents: string[];
  metadatas: Metadata[];
}

const chromaClient = new CloudClient();
let myCollection: Collection | null = null;

const getMyCollection = async () => {
  if (!myCollection) {
    myCollection = await chromaClient.getOrCreateCollection({
      name: "myCollection",
    });
  }
  return myCollection;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const data = req.body as AddDataRequest;
    const collection = await getMyCollection();

    await collection.add({
      ids: data.ids,
      documents: data.documents,
      metadatas: data.metadatas,
    });

    return res.status(200).json({
      success: true,
      message: "Data added successfully",
      data,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to add data" });
  }
}
