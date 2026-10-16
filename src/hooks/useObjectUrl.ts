import { useEffect, useState } from 'react';

export const useObjectUrl = (file?: Blob | null) => {
  const [preview, setPreview] = useState<{ file: Blob; url: string }>();

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return preview?.file === file ? preview?.url : undefined;
};
