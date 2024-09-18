// components/FileUploader.tsx
import React, { useRef } from 'react';
import { Input, Button } from '@chakra-ui/react';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <>
      <Input type="file" onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg,.txt" hidden ref={fileInputRef} />
      <Button onClick={() => fileInputRef.current?.click()}>Attach File</Button>
    </>
  );
};

export default FileUploader;
