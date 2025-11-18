import { Badge } from "@/components/ui/badge";

interface AppealStatusBadgeProps {
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
}

export function AppealStatusBadge({ status }: AppealStatusBadgeProps) {
  const variants = {
    pending: { label: "Pendiente", variant: "secondary" as const },
    under_review: { label: "En revisión", variant: "default" as const },
    approved: { label: "Aprobada", variant: "default" as const },
    rejected: { label: "Rechazada", variant: "destructive" as const },
  };

  const { label, variant } = variants[status];

  return <Badge variant={variant}>{label}</Badge>;
}
