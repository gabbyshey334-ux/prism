import React from "react";
import CESDKEditor from "../components/editor/CESDKEditor";
import { toast } from "sonner";

export default function TestEditor() {
  const handleSave = async ({ scene, previewUrl }) => {
    console.log("Saved scene:", scene);
    console.log("Preview URL:", previewUrl);
    toast.success("Design saved successfully!");
  };

  return (
    <div className="h-screen">
      <CESDKEditor 
        format="instagram_square"
        onSave={handleSave}
        onClose={() => window.history.back()}
      />
    </div>
  );
}