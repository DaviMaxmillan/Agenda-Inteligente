import { useRef, useState } from "react";
import { Paperclip, Trash2, Download, Image as ImageIcon, FileText, File as FileIcon } from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";
import { useListEventAttachments, useCreateEventAttachment, useDeleteEventAttachment, getListEventAttachmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface EventAttachmentsProps {
  eventId: number;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="w-4 h-4 text-blue-500" />;
  if (mimeType === "application/pdf") return <FileText className="w-4 h-4 text-red-500" />;
  return <FileIcon className="w-4 h-4 text-muted-foreground" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EventAttachments({ eventId }: EventAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const { data: attachments, isLoading } = useListEventAttachments(eventId);
  const createAttachment = useCreateEventAttachment();
  const deleteAttachment = useDeleteEventAttachment();

  const { uploadFile } = useUpload({
    onSuccess: async (response: { uploadURL: string; objectPath: string; metadata?: { name: string; size: number; contentType: string } }) => {
      const file = inputRef.current?.files?.[0];
      if (!file) return;
      createAttachment.mutate(
        {
          id: eventId,
          data: {
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            objectPath: response.objectPath,
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEventAttachmentsQueryKey(eventId) });
            toast({ title: "Arquivo anexado com sucesso" });
            setIsUploading(false);
            setUploadProgress(0);
            if (inputRef.current) inputRef.current.value = "";
          },
          onError: () => {
            toast({ title: "Erro ao salvar anexo", variant: "destructive" });
            setIsUploading(false);
          },
        }
      );
    },
    onError: () => {
      toast({ title: "Erro ao fazer upload", variant: "destructive" });
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(10);
    await uploadFile(file);
    setUploadProgress(100);
  };

  const handleDelete = (attachmentId: number) => {
    deleteAttachment.mutate(
      { id: eventId, attachmentId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventAttachmentsQueryKey(eventId) });
          toast({ title: "Anexo removido" });
        },
        onError: () => {
          toast({ title: "Erro ao remover anexo", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Paperclip className="w-4 h-4" />
          <span>Anexos</span>
          {attachments && attachments.length > 0 && (
            <span className="bg-muted rounded-full px-2 py-0.5 text-xs">{attachments.length}</span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="h-8 text-xs gap-1.5"
        >
          <Paperclip className="w-3 h-3" />
          {isUploading ? "Enviando..." : "Adicionar arquivo"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          onChange={handleFileChange}
        />
      </div>

      {isUploading && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">Fazendo upload...</p>
        </div>
      )}

      {isLoading && (
        <p className="text-xs text-muted-foreground">Carregando anexos...</p>
      )}

      {attachments && attachments.length > 0 && (
        <div className="divide-y divide-border/50 rounded-lg border border-border/50 overflow-hidden">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-3 p-3 bg-background hover:bg-muted/30 transition-colors group">
              <div className="shrink-0">{fileIcon(att.mimeType)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.filename}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(att.size)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  asChild
                >
                  <a href={`/api/storage${att.objectPath}`} download={att.filename} target="_blank" rel="noopener noreferrer">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(att.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && attachments?.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Nenhum arquivo anexado ainda.</p>
      )}
    </div>
  );
}
