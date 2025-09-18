"use client";

import { CldUploadWidget } from "next-cloudinary";

const ImageUploader = ({ onUploadSuccess }) => {
  return (
    <div>
      <CldUploadWidget 
        signatureEndpoint="/api/v1/cloudinary/sign"  
        uploadPreset={process.env.NEXT_PUBLIC_UPLOAD_PRESET}
        onSuccess={(result) => {
          if(typeof result.info === "object" && "secure_url" in result.info){
            onUploadSuccess(result.info);
          }
        }}
        options={{
          singleUploadAutoClose: true
        }}
        >
        {({ open }) => {
          return (
            <button
              className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline  focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => open()}
            >
              Upload an Image
            </button>
          );
        }}
      </CldUploadWidget>
    </div>
  );
}

export default ImageUploader