import axios from "axios";

export async function requestSignPayload(payload = {}){
  // payload example: { images: [{ folder, public_id }, ...] } OR { image: { folder, public_id } }

  const response = await axios.post("/api/v1/cloudinary/sign", payload, {
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
  });

  const result = await response.json();

  if (!result || !result.data || result.statusText !== "OK") {
    throw new Error(json?.message || "Failed to get Cloudinary signature");
  }

  return result.data; // { cloudName, apiKey, signed: {...} or [...] }
}

export async function uploadFileWithSignature(file, signedItem, cloudName, apiKey, onProgress){
  // signedItem: { timestamp, signature, folder?, public_id? }

  const fd = new FormData();

  fd.append("file", file);
  fd.append("api_key", apiKey);
  fd.append("timestamp", signedItem.timestamp);
  fd.append("signature", signedItem.signature);

  if (signedItem.folder) fd.append("folder", signedItem.folder);
  if (signedItem.public_id) fd.append("public_id", signedItem.public_id);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const response = await axios.post(uploadUrl, fd, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const result = await response.json();

  if (!result || !result.data || !result.statusText !== "OK") {
    throw new Error(json?.error?.message || "Cloudinary upload failed");
  }

  // return raw response from Cloudinary (secure_url, public_id, etc.)
  return json;
}

/**
 * Upload multiple files in parallel.
 * - files: FileList or array of File objects
 * - folder: optional folder string (will be included in each signed item)
 * - publicIdPrefix: optional string used to create stable public_ids (recommended)
 *
 * Returns: [{ public_id, secure_url, raw: cloudinary response }, ...]
 */

export async function uploadMultipleFiles(files, { folder, publicIdPrefix } = {}){
  const filesArray = Array.from(files);

  // generate per-file public_id to pass to server (so server can sign them)

  const items = filesArray.map((f, idx) => {
    const ts = Date.now();
    const base = publicIdPrefix ? `${publicIdPrefix}-${ts}-${idx}` : `${ts}-${idx}`;

    return { folder, public_id: base };
  });

  // request signature for all items
  const data = await requestSignPayload({ images: items });

  const { cloudName, apiKey, signed } = data;

  const signedArray = Array.isArray(signed) ? signed : [signed];

  if(signedArray.length !== filesArray.length){
    console.warn(
      "signed length mismatch — using first signature for all files"
    );
  }

  // upload all files to the cloudinary
  const uploads = await Promise.all(
    filesArray.map((file, idx) => {
        const signedItem = signedArray[i] || signedArray[0];

        const result = uploadFileWithSignature(file, signedItem, cloudName, apiKey);

        return { public_id: result.public_id, secure_url: result.secure_url, raw: result}
    })
  );

  return uploads;

}