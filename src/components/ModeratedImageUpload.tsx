import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, CheckCircle, XCircle } from "lucide-react";
import { useContentModeration } from "@/hooks/useContentModeration";
import { fileToBase64 } from "@/lib/moderation";

interface ModeratedImageUploadProps {
  label: string;
  onImageValidated: (file: File, dataUrl: string) => void;
  accept?: string;
  maxSizeMB?: number;
}

export function ModeratedImageUpload({
  label,
  onImageValidated,
  accept = "image/jpeg,image/png,image/jpg",
  maxSizeMB = 5
}: ModeratedImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const { validateImage } = useContentModeration();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      setValidationStatus('invalid');
      alert(`La imagen no debe superar ${maxSizeMB}MB`);
      return;
    }

    setSelectedFile(file);
    setValidationStatus('validating');

    try {
      // Convertir a base64 para preview y validación
      const dataUrl = await fileToBase64(file);
      setPreview(dataUrl);

      // Validar con moderación
      const isValid = await validateImage(dataUrl, label);

      if (isValid) {
        setValidationStatus('valid');
        onImageValidated(file, dataUrl);
      } else {
        setValidationStatus('invalid');
        setSelectedFile(null);
        setPreview("");
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setValidationStatus('invalid');
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="image-upload">{label}</Label>
      
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            id="image-upload"
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={validationStatus === 'validating'}
          />
        </div>

        {validationStatus === 'validating' && (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        
        {validationStatus === 'valid' && (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
        
        {validationStatus === 'invalid' && (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
      </div>

      {preview && validationStatus === 'valid' && (
        <div className="mt-2">
          <img
            src={preview}
            alt="Preview"
            className="max-w-xs rounded-lg border"
          />
        </div>
      )}

      {validationStatus === 'validating' && (
        <p className="text-sm text-muted-foreground">
          🔍 Validando imagen con moderación de contenido...
        </p>
      )}
    </div>
  );
}
