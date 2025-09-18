"use client"

import React, { useState } from "react";
import ImageUploader from "./components/admin/ImageUploader";


export default function AdminAddVariant() {
 
  const handleUpload = async (info) => {
    const payload = {
      public_id: info.public_id,
      secure_url: info.secure_url || info.url,
      format: info.format,
      width: info.width,
      height: info.height,
      original_filename: info.original_filename,
    }

    try {
      const response = await axios.post("/api/v1/variants", payload, {
        headers: {
          "Content-Type": "application/json"
        }
      });

      const res = await response.json();

      console.log(res);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div>
      <ImageUploader onUploadSuccess={handleUpload} />
    </div>
  );
}
